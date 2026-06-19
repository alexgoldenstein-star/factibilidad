// Verificación de normativa CUR (Ley 6099) por dirección.
//
// Esta función llama a un endpoint serverless propio (api/verificar-normativa)
// que a su vez usa la API de Claude con web_search habilitado para consultar
// el Código Urbanístico de CABA y devolver la tipología, altura máxima y
// morfología edificable correspondiente a la dirección ingresada.
//
// IMPORTANTE: esto NO reemplaza un informe de prefactibilidad profesional
// (como el de OKLands). Es una primera aproximación automática que después
// se debe confirmar con la plancheta oficial del GCBA.

export async function verificarNormativaPorDireccion(direccion) {
  const res = await fetch("/api/verificar-normativa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direccion }),
  });

  if (!res.ok) {
    throw new Error("No se pudo verificar la normativa. Intentá de nuevo o cargá los datos manualmente.");
  }

  const data = await res.json();
  // data esperada: { tipologia, hMax, morfologia, zonaUso, fuente, confianza }
  return data;
}
