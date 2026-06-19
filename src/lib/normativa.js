// Verificación de normativa CUR (Ley 6099) por dirección.
//
// Esta función llama a un endpoint serverless propio (api/verificar-normativa)
// que a su vez usa la API de Claude con web_search habilitado para consultar
// el Código Urbanístico de CABA y devolver la tipología, altura máxima y
// morfología edificable correspondiente a la dirección ingresada.
//
// Si se compran varios lotes (doble/triple/cuádruple frente) para unificar,
// pasá todas las direcciones — el sistema busca la normativa de la parcela
// unificada usando la dirección principal como referencia.
//
// IMPORTANTE: esto NO reemplaza un informe de prefactibilidad profesional
// (como el de OKLands). Es una primera aproximación automática que después
// se debe confirmar con la plancheta oficial del GCBA.

export async function verificarNormativaPorDireccion(direccion, direccionesAdicionales = []) {
  const res = await fetch("/api/verificar-normativa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direccion, direccionesAdicionales }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo verificar la normativa. Intentá de nuevo o cargá los datos manualmente.");
  }

  const data = await res.json();
  // data esperada: { tipologia, hMax, morfologia, zonaUso, fuente, confianza, notas }
  return data;
}

/**
 * Análisis de mercado / panorama de zona: precio USD/m² por tipo de unidad,
 * demanda relativa, tendencia, perfil de comprador. Sirve para calibrar
 * el mix de unidades y el precio de venta objetivo del proyecto.
 */
export async function analizarZonaMercado(direccion, barrio = "") {
  const res = await fetch("/api/analisis-zona", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direccion, barrio }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo generar el análisis de zona. Intentá de nuevo.");
  }

  return res.json();
}
