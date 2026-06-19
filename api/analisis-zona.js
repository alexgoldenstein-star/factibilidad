// Vercel Serverless Function (Node.js runtime)
// POST /api/analisis-zona
// body: { direccion: string, barrio?: string }
//
// Usa Claude + web_search para armar un panorama de mercado de la zona:
// precio promedio USD/m2 por tipo de unidad, demanda relativa, y
// comparables recientes. Sirve como insumo para decidir mix de unidades
// y precio de venta objetivo.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { direccion, barrio } = req.body || {};
  const zona = barrio || direccion;
  if (!zona || zona.trim().length < 3) {
    return res.status(400).json({ error: "Falta la dirección o el barrio" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  const systemPrompt = `Sos un analista de mercado inmobiliario especializado en CABA, Argentina.
Tu tarea es buscar información pública actual sobre precios de venta de departamentos en una zona específica
(portales como Zonaprop, Argenprop, Reporte Inmobiliario) y devolver SOLO un JSON con esta estructura exacta,
sin texto adicional, sin markdown, sin backticks:

{
  "zona": "string - el barrio o zona analizada",
  "precioPromedioM2": number,
  "precioPromedioM2Min": number,
  "precioPromedioM2Max": number,
  "porTipoUnidad": [
    { "tipo": "Monoambiente", "precioM2": number, "demanda": "alta" | "media" | "baja", "comentario": "string" },
    { "tipo": "1 ambiente", "precioM2": number, "demanda": "alta" | "media" | "baja", "comentario": "string" },
    { "tipo": "2 ambientes", "precioM2": number, "demanda": "alta" | "media" | "baja", "comentario": "string" },
    { "tipo": "3 ambientes", "precioM2": number, "demanda": "alta" | "media" | "baja", "comentario": "string" }
  ],
  "tendencia": "string - si los precios están subiendo, bajando o estables, y por qué",
  "perfilComprador": "string - quién compra en esta zona (inversores, familias, profesionales jóvenes, etc.)",
  "factoresClave": ["string", "string"],
  "fuentes": ["string - nombres de portales o fuentes consultadas"],
  "confianza": "alta" | "media" | "baja",
  "notas": "string"
}

Sé específico con números reales de mercado actual, no inventes cifras genéricas. Si no encontrás datos confiables
para la zona exacta, usá zonas comparables cercanas y aclaralo en "notas".`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Buscá el panorama actual de precios de venta de departamentos en: "${zona}", CABA, Argentina. Necesito precio USD/m² promedio y por tipo de unidad (monoambiente, 1, 2, 3 ambientes), y nivel de demanda relativa de cada tipo.`,
          },
        ],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Error consultando la API de Claude", detail: errText });
    }

    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text);
    const fullText = textBlocks.join("\n").trim();

    let parsed = null;
    const intentos = [
      () => JSON.parse(fullText),
      () => {
        const m = fullText.match(/```json\s*([\s\S]*?)```/i);
        return m ? JSON.parse(m[1]) : null;
      },
      () => {
        const start = fullText.indexOf("{");
        const end = fullText.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) return null;
        return JSON.parse(fullText.slice(start, end + 1));
      },
    ];
    for (const intento of intentos) {
      try {
        const r = intento();
        if (r) { parsed = r; break; }
      } catch (e) { /* probar siguiente */ }
    }

    if (!parsed) {
      return res.status(502).json({
        error: "No se pudo interpretar el análisis de zona. Probá de nuevo.",
        rawResponse: fullText.slice(0, 2000),
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Error interno", detail: String(err) });
  }
}
