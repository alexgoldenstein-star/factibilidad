import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtUSD, fmtN, pctFmt } from "./factibilidad";

const GOLD = [201, 168, 76];
const DARK = [20, 22, 28];
const GRAY = [90, 90, 90];

export function generarReporteInversores(proyecto, resultado) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 0;

  // ── Portada ──────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 230, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 226, pageW, 4, "F");

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AGF DESARROLLOS INMOBILIARIOS", margin, 60);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text("Estudio de Factibilidad", margin, 110);
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(proyecto.nombre || "Proyecto sin nombre", margin, 140);

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(proyecto.direccion || "Dirección no especificada", margin, 165);
  doc.text("Cliente / Inversor: " + (proyecto.cliente || "—"), margin, 182);
  doc.text("Fecha: " + new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" }), margin, 199);

  y = 260;

  // ── Resumen ejecutivo (KPIs) ─────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen ejecutivo", margin, y);
  y += 10;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + 80, y);
  y += 25;

  const kpis = [
    ["Ingreso total bruto", fmtUSD(resultado.ingresoTotal)],
    ["Costo total", fmtUSD(resultado.costoTotal)],
    ["Margen neto", fmtUSD(resultado.margen)],
    ["Margen sobre ventas", pctFmt(resultado.pctMargen)],
    ["ROI sobre inversión", pctFmt(resultado.roi)],
    ["TIR estimada (anual)", pctFmt(resultado.tirEstimada)],
  ];

  const kpiBoxW = (pageW - margin * 2 - 20) / 3;
  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = margin + col * (kpiBoxW + 10);
    const by = y + row * 70;
    doc.setFillColor(245, 243, 235);
    doc.roundedRect(bx, by, kpiBoxW, 58, 4, 4, "F");
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(k[0], bx + 12, by + 20);
    doc.setTextColor(...DARK);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(String(k[1]), bx + 12, by + 42);
  });
  y += 160;

  // veredicto
  const veredictos = {
    viable: "El proyecto muestra rentabilidad sólida y se recomienda avanzar con las siguientes etapas de desarrollo.",
    ajustes: "El proyecto es viable pero ajustado. Se recomienda revisar costos de construcción o renegociar el valor del terreno antes de avanzar.",
    bajo: "El margen obtenido es bajo para el nivel de riesgo del negocio inmobiliario. Se sugiere revisar precio de terreno, mix de unidades o estrategia comercial.",
    novalido: "El proyecto no resulta viable en los parámetros actuales y requiere una revisión profunda de su estructura de costos.",
  };
  doc.setFillColor(...(resultado.semaforo.nivel === "viable" ? [232, 246, 239] : resultado.semaforo.nivel === "ajustes" ? [253, 243, 220] : [253, 232, 232]));
  doc.roundedRect(margin, y, pageW - margin * 2, 50, 4, 4, "F");
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  const veredictoText = veredictos[resultado.semaforo.nivel] || "";
  const splitText = doc.splitTextToSize(veredictoText, pageW - margin * 2 - 24);
  doc.text(splitText, margin + 12, y + 20);
  y += 80;

  // ── Datos del terreno ─────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Datos del terreno y normativa", margin, y);
  y += 15;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 5, textColor: DARK },
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", textColor: GRAY } },
    body: [
      ["Dirección", proyecto.direccion || "—"],
      ["Superficie del terreno", fmtN(proyecto.supTerreno) + " m²"],
      ["Frente × Fondo", `${proyecto.frente} m × ${proyecto.fondo} m`],
      ["Tipología (Ley 6099)", `${proyecto.tipologia} — ${resultado.tip.label}`],
      ["Altura máxima permitida", proyecto.hMax + " m"],
      ["Morfología edificable", proyecto.morfologia],
      ["Precio del terreno", fmtUSD(proyecto.precioTerreno)],
    ],
  });
  y = doc.lastAutoTable.finalY + 30;

  // ── Cómputo de superficies ────────────────────────────────
  if (y > 650) { doc.addPage(); y = 50; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Cómputo de superficies", margin, y);
  y += 15;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: "bold" },
    head: [["Sector", "m² construidos", "Cantidad", "Observación"]],
    body: [
      ["Viviendas", fmtN(proyecto.m2Viviendas) + " m²", "—", pctFmt(proyecto.pctVendible) + " vendible"],
      ["Locales / exteriores", fmtN(proyecto.m2Comercial) + " m²", "—", "—"],
      ["Cocheras PB", fmtN(proyecto.m2CochPB) + " m²", proyecto.cochPBQty + " unidades", "Descubiertas"],
      ["Cocheras subsuelo", fmtN(proyecto.m2CochSS) + " m²", proyecto.cochSSQty + " unidades", "—"],
      ["Espacios comunes", fmtN(proyecto.m2Comunes) + " m²", "—", "—"],
      ["TOTAL CONSTRUIDO", fmtN(resultado.m2TotalConst) + " m²", "—", ""],
      ["TOTAL VENDIBLE (ponderado)", fmtN(resultado.m2Vendibles) + " m²", "—", ""],
    ],
  });
  y = doc.lastAutoTable.finalY + 30;

  // ── Estructura de costos ──────────────────────────────────
  if (y > 600) { doc.addPage(); y = 50; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Estructura de costos", margin, y);
  y += 15;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: "bold" },
    head: [["Concepto", "Monto (USD)", "% del total"]],
    body: [
      ["Costo directo de construcción", fmtUSD(resultado.cdcTotal), pctFmt((resultado.cdcTotal / resultado.costoTotal) * 100)],
      ["Costos blandos (honorarios)", fmtUSD(resultado.costosBlandos), pctFmt((resultado.costosBlandos / resultado.costoTotal) * 100)],
      ["Terreno (+ comisión + escrituración)", fmtUSD(resultado.totalTerreno), pctFmt((resultado.totalTerreno / resultado.costoTotal) * 100)],
      ["Plusvalía (Ley 6062)", fmtUSD(resultado.plusvaliaUSD), pctFmt((resultado.plusvaliaUSD / resultado.costoTotal) * 100)],
      ["Derechos de construcción", fmtUSD(resultado.derechosConstruccion), pctFmt((resultado.derechosConstruccion / resultado.costoTotal) * 100)],
      ["Gastos de venta y comercialización", fmtUSD(resultado.costoVentas), pctFmt((resultado.costoVentas / resultado.costoTotal) * 100)],
    ],
    foot: [["COSTO TOTAL", fmtUSD(resultado.costoTotal), "100%"]],
    footStyles: { fillColor: [245, 243, 235], textColor: DARK, fontStyle: "bold" },
  });
  y = doc.lastAutoTable.finalY + 30;

  // ── Plan de ventas ─────────────────────────────────────────
  if (y > 580) { doc.addPage(); y = 50; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Plan de ventas por fases", margin, y);
  y += 15;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: "bold" },
    head: [["Fase", "% unidades", "Ingreso estimado"]],
    body: [
      [`Preventa / Pozo (desc. ${proyecto.descPreventa}%)`, proyecto.pctPreventa + "%", fmtUSD(resultado.prevTotal)],
      ["Durante obra", proyecto.pctObra + "%", fmtUSD(resultado.obraTotal)],
      [`Terminado (sobreprecio ${proyecto.sobrePrecioTerminado}%)`, proyecto.pctTerminado + "%", fmtUSD(resultado.termTotal)],
      ["Cocheras (PB + subsuelo)", "—", fmtUSD(resultado.ingresoCochPB + resultado.ingresoCochSS)],
    ],
  });
  y = doc.lastAutoTable.finalY + 30;

  // ── Flujo de fondos ────────────────────────────────────────
  if (y > 500) { doc.addPage(); y = 50; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Flujo de fondos proyectado", margin, y);
  y += 15;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4, halign: "right" },
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: "bold", halign: "right" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    head: [["Concepto", "Año 1", "Año 2", "Año 3", "Año 4", "Año 5"]],
    body: [
      ["Ingresos", ...resultado.ingresos.map(fmtUSD)],
      ["Egresos", ...resultado.egresos.map(fmtUSD)],
      ["Saldo", ...resultado.saldos.map(fmtUSD)],
      ["Saldo acumulado", ...resultado.acumulados.map(fmtUSD)],
    ],
  });
  y = doc.lastAutoTable.finalY + 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...GRAY);
  doc.text(`Máxima exposición de caja estimada: ${fmtUSD(resultado.maxExposicion)}`, margin, y);

  // ── Footer en todas las páginas ───────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 800, pageW - margin, 800);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("AGF Desarrollos Inmobiliarios — Documento confidencial para uso interno e inversores", margin, 815);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin - 60, 815);
  }

  return doc;
}

export function descargarReporte(proyecto, resultado) {
  const doc = generarReporteInversores(proyecto, resultado);
  const filename = `Factibilidad_${(proyecto.nombre || "proyecto").replace(/[^a-z0-9]/gi, "_")}.pdf`;
  doc.save(filename);
}
