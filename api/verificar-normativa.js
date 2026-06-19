// Vercel Serverless Function (Node.js runtime)
// POST /api/verificar-normativa
// body: { direccion: string }
//
// Usa la API de Claude con web_search para consultar el mapa de edificabilidad
// del GCBA (Ley 6099 - Código Urbanístico) y devolver la tipología aplicable
// a la dirección ingresada.
//
// Requiere la variable de entorno ANTHROPIC_API_KEY configurada en Vercel
// (Project Settings > Environment Variables).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { direccion, direccionesAdicionales } = req.body || {};
  if (!direccion || direccion.trim().length < 3) {
    return res.status(400).json({ error: "Falta la dirección o es muy corta" });
  }

  const todasLasDirecciones = [direccion, ...(direccionesAdicionales || []).filter(Boolean)];
  const esUnificado = todasLasDirecciones.length > 1;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  const systemPrompt = `Sos un asistente especializado en el Código Urbanístico de la Ciudad de Buenos Aires (Ley 6099).
Tu tarea es buscar información pública sobre la zonificación de una dirección específica en CABA y devolver SOLO un JSON
con esta estructura exacta, sin texto adicional, sin markdown, sin backticks:

{
  "direccion": "string - la dirección consultada",
  "tipologia": "string - una de: C.A., C.M., U.S.A.A., U.S.A.M., U.S.A.B.2, U.S.A.B.1",
  "hMax": number,
  "morfologia": "string - ej: PB + 5 pisos + 2 retiros",
  "zonaUso": "string - descripción breve del área de uso del suelo",
  "fuente": "string - de dónde sacaste el dato (ej: mapa GCBA, plancheta catastral)",
  "confianza": "alta" | "media" | "baja",
  "notas": "string - cualquier advertencia relevante (ej: si es área de protección histórica, área especial, etc.)"
}

Si no podés determinar la zonificación con confianza, usá "confianza": "baja" y explicá por qué en "notas".
Recordá que este código NO usa FOT/FOS, usa tipologías por altura máxima (C.A., C.M., U.S.A.A., U.S.A.M., U.S.A.B.2, U.S.A.B.1).`;

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
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: esUnificado
              ? `Buscá la zonificación según el Código Urbanístico (Ley 6099) de CABA para esta unificación de parcelas (compra de lotes contiguos): ${todasLasDirecciones.map((d) => `"${d}"`).join(", ")}. Como se van a unificar en una sola parcela, indicá la tipología que aplica al conjunto (normalmente la del lote principal o la más restrictiva del grupo). Usá el mapa de edificabilidad del GCBA (buenosaires.gob.ar/desarrollourbano).`
              : `Buscá la zonificación según el Código Urbanístico (Ley 6099) de CABA para esta dirección: "${direccion}". Usá el mapa de edificabilidad del GCBA (buenosaires.gob.ar/desarrollourbano).`,
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

    // Intentar parsear el JSON de la respuesta. Probamos varias estrategias
    // porque el modelo puede devolver texto explicativo alrededor del JSON,
    // o el JSON envuelto en ```json ... ``` pese a la instrucción de no hacerlo.
    let parsed = null;
    const intentos = [
      () => JSON.parse(fullText),
      () => {
        const m = fullText.match(/```json\s*([\s\S]*?)```/i);
        return m ? JSON.parse(m[1]) : null;
      },
      () => {
        // toma el bloque { ... } más largo balanceado
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
      } catch (e) { /* probar siguiente estrategia */ }
    }

    if (!parsed) {
      return res.status(502).json({
        error: "No se pudo interpretar la respuesta de normativa. Probá de nuevo o cargá los datos manualmente.",
        rawResponse: fullText.slice(0, 2000),
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Error interno", detail: String(err) });
  }
}
