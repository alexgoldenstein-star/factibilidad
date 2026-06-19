// Motor de cálculo de factibilidad inmobiliaria — AGF Desarrollos
// Basado en: Ley 6099 (CUR), metodología Arq. Topor (DPI-UBA), modelo OKLands

export const TIPOLOGIAS = {
  "C.A.":     { label: "Corredor Alto",                 hMax: 38,   morfologia: "PB + 12 pisos + 2 retiros", basamento: 6 },
  "C.M.":     { label: "Corredor Medio",                hMax: 31.2, morfologia: "PB + 10 pisos + 2 retiros", basamento: 6 },
  "U.S.A.A.": { label: "Unidad Sustentabilidad Alta",   hMax: 22.8, morfologia: "PB + 7 pisos + 2 retiros",  basamento: 0 },
  "U.S.A.M.": { label: "Unidad Sustentabilidad Media",  hMax: 17.2, morfologia: "PB + 5 pisos + 2 retiros",  basamento: 0 },
  "U.S.A.B.2":{ label: "Unidad Sustentabilidad Baja 2", hMax: 11.6, morfologia: "PB + 3 pisos + 1 retiro",   basamento: 0 },
  "U.S.A.B.1":{ label: "Unidad Sustentabilidad Baja 1", hMax: 9,    morfologia: "PB + 2 pisos",              basamento: 0 },
};

export const ALICUOTAS_PLUSVALIA = { 1: 0.20, 2: 0.25, 3: 0.27, 4: 0.35 };

export const DEFAULT_PROJECT = {
  // metadata
  nombre: "",
  cliente: "",
  fechaCreacion: null,
  fechaModificacion: null,

  // terreno — uno o más lotes que se unifican en un solo análisis
  // (compra de doble/triple/cuádruple frente). El lote[0] es el "principal"
  // y de ahí sale la dirección base para buscar normativa.
  lotes: [
    { direccion: "", frente: 18, fondo: 34, precio: 550000 },
  ],
  tipologia: "U.S.A.M.",
  anchoCalle: 17,
  tipLote: "entremedianeras",

  // normativa
  hMax: 17.2,
  morfologia: "PB + 5 pisos + 2 retiros",
  basamento: 0,
  pisosReal: 6,

  // m2 por sector
  m2Viviendas: 2379,
  m2Comercial: 112,
  m2CochPB: 294,
  m2CochSS: 475,
  m2Comunes: 827,
  cochPBQty: 11,
  cochSSQty: 16,
  pctVendible: 85,

  // mix unidades
  unitsMix: { mono: 0, u1: 50, u2: 40, u3: 10 },
  precioVivUSD: 1700,
  precioExtUSD: 567,
  precioCochPB: 17000,
  precioCochSS: 17000,

  // costos construcción
  costoVivM2: 500,
  costoExtM2: 250,
  costoCochPBM2: 300,
  costoCochSSM2: 350,

  // costos blandos %
  pctProyecto: 3,
  pctDireccion: 3,
  pctGerenc: 2,
  pctAsesores: 1.5,
  pctAdmin: 1.5,
  pctDesarrollo: 4,

  // ventas
  pctMarketing: 1.5,
  pctComisionVenta: 2,
  pctEscrituracion: 7.7,
  pctIVA: 12,

  // plusvalía
  derechosConstruccionM2: 10,
  alicuotaZona: 3,
  fotCPU: 2.5,
  inciUVA: 830,
  valorUVA: 1400,
  valorTC: 1250,

  // terreno extra
  comisionCompraTerreno: 2,
  escTerreno: 15000,

  // plan ventas
  pctPreventa: 25,
  descPreventa: 10,
  pctObra: 40,
  pctTerminado: 35,
  sobrePrecioTerminado: 10,
};

/**
 * Motor de cálculo central. Recibe el estado del proyecto y devuelve
 * todos los indicadores derivados (costos, ingresos, márgenes, flujo de fondos).
 */
/**
 * Normaliza el proyecto: migra el formato viejo (un solo terreno con
 * direccion/frente/fondo/precioTerreno sueltos) al formato nuevo (array
 * de lotes), y calcula los agregados (supTerreno, frente total, precio total)
 * que el resto del motor de cálculo necesita.
 */
export function normalizarProyecto(p) {
  let lotes = p.lotes;

  // Migración desde formato viejo (proyectos guardados antes del cambio a multi-lote)
  if (!Array.isArray(lotes) || lotes.length === 0) {
    lotes = [{
      direccion: p.direccion || "",
      frente: p.frente || 18,
      fondo: p.fondo || 34,
      precio: p.precioTerreno || 0,
    }];
  }

  const supTerreno = lotes.reduce((acc, l) => acc + (Number(l.frente) || 0) * (Number(l.fondo) || 0), 0);
  const frenteTotal = lotes.reduce((acc, l) => acc + (Number(l.frente) || 0), 0);
  const fondoMax = Math.max(...lotes.map((l) => Number(l.fondo) || 0), 0);
  const precioTerreno = lotes.reduce((acc, l) => acc + (Number(l.precio) || 0), 0);
  const direccion = lotes[0]?.direccion || p.direccion || "";

  return { ...p, lotes, supTerreno, frente: frenteTotal, fondo: fondoMax, precioTerreno, direccion };
}

export function calcularFactibilidad(pInput) {
  const p = normalizarProyecto(pInput);
  const tip = TIPOLOGIAS[p.tipologia] || TIPOLOGIAS["U.S.A.M."];

  // LFI / LIB aproximados (sin reemplazar el cómputo de un arquitecto)
  const lfiCalc = Math.min(p.frente * (p.fondo / 4), p.fondo * 0.25 + 9);
  const libCalc = p.frente * (p.fondo / 3);

  // m2 construibles y vendibles
  const m2TotalConst = p.m2Viviendas + p.m2Comercial + p.m2CochPB + p.m2CochSS + p.m2Comunes;
  const m2ViviendasVendibles = p.m2Viviendas * (p.pctVendible / 100);
  const m2Vendibles = Math.round(m2ViviendasVendibles) + p.m2Comercial + p.cochPBQty + p.cochSSQty;

  // costos directos de construcción (CDC)
  const cdcViv = p.costoVivM2 * p.m2Viviendas;
  const cdcExt = p.costoExtM2 * p.m2Comercial;
  const cdcCochPB = p.costoCochPBM2 * p.m2CochPB;
  const cdcCochSS = p.costoCochSSM2 * p.m2CochSS;
  const cdcTotal = cdcViv + cdcExt + cdcCochPB + cdcCochSS;

  // costos blandos
  const pctBlandosTotal = p.pctProyecto + p.pctDireccion + p.pctGerenc + p.pctAsesores + p.pctAdmin + p.pctDesarrollo;
  const costosBlandos = cdcTotal * (pctBlandosTotal / 100);

  // terreno
  const comisionTerreno = p.precioTerreno * (p.comisionCompraTerreno / 100);
  const totalTerreno = p.precioTerreno + comisionTerreno + p.escTerreno;

  // plusvalía Ley 6062
  const a1 = m2TotalConst * 0.8;
  const a2 = p.supTerreno * p.fotCPU;
  const edificAdic = Math.max(0, a1 - a2);
  const incidenciaUSDm2 = (p.inciUVA * p.valorUVA) / p.valorTC;
  const plusvaliaUSD = edificAdic * incidenciaUSDm2 * (ALICUOTAS_PLUSVALIA[p.alicuotaZona] || 0.27);
  const derechosConstruccion = p.derechosConstruccionM2 * m2TotalConst;

  // ingresos
  const ingresoViv = p.m2Viviendas * p.precioVivUSD * (p.pctVendible / 100);
  const ingresoExt = p.m2Comercial * p.precioExtUSD;
  const ingresoCochPB = p.cochPBQty * p.precioCochPB;
  const ingresoCochSS = p.cochSSQty * p.precioCochSS;
  const ingresoTotal = ingresoViv + ingresoExt + ingresoCochPB + ingresoCochSS;

  // gastos de venta
  const marketing = ingresoTotal * (p.pctMarketing / 100);
  const comisionVenta = ingresoTotal * (p.pctComisionVenta / 100);
  const escrituracion = ingresoTotal * (p.pctEscrituracion / 100);

  // IVA simplificado
  const ivaVentas = ingresoTotal * 0.105;
  const ivaCostos = cdcTotal * (p.pctIVA / 100);
  const ivaAPagar = Math.max(0, ivaVentas - ivaCostos);

  const costoVentas = marketing + comisionVenta + escrituracion + ivaAPagar;

  // totales
  const costoTotal = cdcTotal + costosBlandos + totalTerreno + plusvaliaUSD + derechosConstruccion + costoVentas;
  const margen = ingresoTotal - costoTotal;
  const pctMargen = ingresoTotal > 0 ? (margen / ingresoTotal) * 100 : 0;
  const roi = costoTotal > 0 ? (margen / costoTotal) * 100 : 0;
  const tirEstimada = pctMargen * 0.6;

  // incidencias
  const incidenciaTierra = m2TotalConst > 0 ? p.precioTerreno / m2TotalConst : 0;
  const incidenciaSobreVendibles = m2ViviendasVendibles > 0 ? p.precioTerreno / m2ViviendasVendibles : 0;
  const costoM2SinVentas = m2TotalConst > 0
    ? (cdcTotal + costosBlandos + totalTerreno + plusvaliaUSD + derechosConstruccion) / m2TotalConst
    : 0;

  // plan de ventas
  const prevViv = m2ViviendasVendibles * (p.pctPreventa / 100);
  const prevTotal = prevViv * p.precioVivUSD * (1 - p.descPreventa / 100);
  const obraTotal = m2ViviendasVendibles * (p.pctObra / 100) * p.precioVivUSD;
  const termTotal = m2ViviendasVendibles * (p.pctTerminado / 100) * p.precioVivUSD * (1 + p.sobrePrecioTerminado / 100);

  // flujo de fondos (5 años, distribución estándar de obra)
  const egresos = [costoTotal * 0.28, costoTotal * 0.21, costoTotal * 0.21, costoTotal * 0.21, costoTotal * 0.09];
  const ingresos = [
    prevTotal * 0.30,
    prevTotal * 0.23 + obraTotal * 0.25,
    prevTotal * 0.23 + obraTotal * 0.25,
    prevTotal * 0.24 + obraTotal * 0.25 + termTotal * 0.50,
    obraTotal * 0.25 + termTotal * 0.50 + ingresoCochPB + ingresoCochSS,
  ];
  const saldos = egresos.map((e, i) => ingresos[i] - e);
  const acumulados = saldos.reduce((acc, s, i) => { acc.push((acc[i - 1] || 0) + s); return acc; }, []);
  const maxExposicion = Math.min(...acumulados);

  // semáforo de viabilidad
  let semaforo;
  if (m2TotalConst === 0) {
    semaforo = { nivel: "pendiente", color: "#888", label: "Completando datos" };
  } else if (pctMargen >= 25) {
    semaforo = { nivel: "viable", color: "#1D9E75", label: "Proyecto viable" };
  } else if (pctMargen >= 15) {
    semaforo = { nivel: "ajustes", color: "#BA7517", label: "Viable con ajustes" };
  } else if (pctMargen >= 0) {
    semaforo = { nivel: "bajo", color: "#D85A30", label: "Margen bajo" };
  } else {
    semaforo = { nivel: "novalido", color: "#A32D2D", label: "No viable" };
  }

  return {
    tip, lfiCalc, libCalc,
    supTerreno: p.supTerreno, precioTerrenoTotal: p.precioTerreno,
    m2TotalConst, m2ViviendasVendibles, m2Vendibles,
    cdcViv, cdcExt, cdcCochPB, cdcCochSS, cdcTotal,
    pctBlandosTotal, costosBlandos,
    comisionTerreno, totalTerreno,
    edificAdic, incidenciaUSDm2, plusvaliaUSD, derechosConstruccion,
    ingresoViv, ingresoExt, ingresoCochPB, ingresoCochSS, ingresoTotal,
    marketing, comisionVenta, escrituracion, ivaVentas, ivaCostos, ivaAPagar, costoVentas,
    costoTotal, margen, pctMargen, roi, tirEstimada,
    incidenciaTierra, incidenciaSobreVendibles, costoM2SinVentas,
    prevTotal, obraTotal, termTotal,
    egresos, ingresos, saldos, acumulados, maxExposicion,
    semaforo,
  };
}

export function fmtUSD(n) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000000) return sign + "USD " + (abs / 1000000).toFixed(2) + "M";
  if (abs >= 1000) return sign + "USD " + Math.round(abs / 1000) + "K";
  return sign + "USD " + Math.round(abs).toLocaleString("es-AR");
}
export const fmtN = (n) => (n == null ? "—" : Math.round(n).toLocaleString("es-AR"));
export const pctFmt = (n) => (n == null ? "—" : Math.round(n) + "%");
