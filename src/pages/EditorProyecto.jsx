import { useState, useEffect, useRef, useCallback } from "react";
import { TIPOLOGIAS, calcularFactibilidad, fmtUSD, fmtN, pctFmt, DEFAULT_PROJECT } from "../lib/factibilidad";
import { obtenerProyecto, guardarProyecto } from "../lib/proyectos";
import { verificarNormativaPorDireccion, analizarZonaMercado } from "../lib/normativa";
import { descargarReporte } from "../lib/reportePDF";
import { S, gold, CRow, Field } from "../components/styles.jsx";

const TABS = ["Terreno", "Normativa", "Unidades", "Costos", "Ventas", "Resumen"];
const SAVE_DEBOUNCE_MS = 1500;

export default function EditorProyecto({ proyectoId, onVolver }) {
  const [p, setP] = useState(DEFAULT_PROJECT);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [normLoading, setNormLoading] = useState(false);
  const [normResult, setNormResult] = useState(null);
  const [normError, setNormError] = useState(null);
  const [zonaLoading, setZonaLoading] = useState(false);
  const [zonaResult, setZonaResult] = useState(null);
  const [zonaError, setZonaError] = useState(null);
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);

  // cargar proyecto
  useEffect(() => {
    let active = true;
    setLoading(true);
    obtenerProyecto(proyectoId).then((data) => {
      if (!active) return;
      if (data) {
        const merged = { ...DEFAULT_PROJECT, ...data };
        // proyectos guardados antes de soportar multi-lote, o con lotes null por sanitización
        if (!Array.isArray(merged.lotes) || merged.lotes.length === 0) {
          merged.lotes = [{
            direccion: data.direccion || "",
            frente: data.frente || 18,
            fondo: data.fondo || 34,
            precio: data.precioTerreno || 0,
          }];
        }
        setP(merged);
      }
      isFirstLoad.current = true;
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [proyectoId]);

  // guardado automático con debounce
  const update = useCallback((patch) => {
    setP((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await guardarProyecto(proyectoId, p);
        setSaveState("saved");
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2500);
      } catch (e) {
        console.error("Error al guardar proyecto:", e);
        setSaveState("error");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, loading]);

  const r = calcularFactibilidad(p);

  const agregarLote = () => {
    if (p.lotes.length >= 4) return; // hasta cuádruple frente
    update({ lotes: [...p.lotes, { direccion: "", frente: 0, fondo: p.lotes[0]?.fondo || 0, precio: 0 }] });
  };

  const quitarLote = (i) => {
    update({ lotes: p.lotes.filter((_, idx) => idx !== i) });
  };

  const actualizarLote = (i, patch) => {
    update({ lotes: p.lotes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  };

  const handleVerificarNormativa = async () => {
    const direccionPrincipal = p.lotes[0]?.direccion;
    if (!direccionPrincipal) return;
    setNormLoading(true);
    setNormError(null);
    setNormResult(null);
    try {
      const direccionesAdicionales = p.lotes.slice(1).map((l) => l.direccion).filter(Boolean);
      const result = await verificarNormativaPorDireccion(direccionPrincipal, direccionesAdicionales);
      setNormResult(result);
    } catch (e) {
      setNormError(e.message || "Error al verificar normativa");
    }
    setNormLoading(false);
  };

  const aplicarNormativa = () => {
    if (!normResult) return;
    const tipKey = Object.keys(TIPOLOGIAS).find((k) => k === normResult.tipologia) || p.tipologia;
    update({
      tipologia: tipKey,
      hMax: normResult.hMax || TIPOLOGIAS[tipKey]?.hMax || p.hMax,
      morfologia: normResult.morfologia || TIPOLOGIAS[tipKey]?.morfologia || p.morfologia,
    });
    setTab(1);
  };

  const handleAnalizarZona = async () => {
    const direccionPrincipal = p.lotes[0]?.direccion;
    if (!direccionPrincipal) return;
    setZonaLoading(true);
    setZonaError(null);
    setZonaResult(null);
    try {
      const result = await analizarZonaMercado(direccionPrincipal);
      setZonaResult(result);
    } catch (e) {
      setZonaError(e.message || "Error al analizar la zona");
    }
    setZonaLoading(false);
  };

  const aplicarPrecioZona = () => {
    if (!zonaResult?.precioPromedioM2) return;
    update({ precioVivUSD: Math.round(zonaResult.precioPromedioM2) });
    setTab(2);
  };

  const handleDescargarPDF = () => {
    descargarReporte(p, r);
  };

  if (loading) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#666", fontSize: 13 }}>Cargando proyecto...</span>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <header style={S.header}>
        <button style={S.logo} onClick={onVolver}>← AGF · Factibilidad</button>
        <span style={{ fontSize: 13, color: "#999", marginLeft: 8 }}>{p.nombre}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={S.saveIndicator(saveState)}>
            {saveState === "saving" && "Guardando..."}
            {saveState === "saved" && "✓ Guardado"}
            {saveState === "error" && "⚠ Error al guardar"}
          </span>
          <button style={{ ...S.btn, padding: "7px 14px", fontSize: 11 }} onClick={handleDescargarPDF}>
            Descargar PDF ↓
          </button>
        </div>
      </header>

      <div style={{ ...S.body, paddingTop: "1.5rem" }}>
        <div style={S.main}>
          <div style={S.progress}><div style={S.progressFill((tab + 1) * (100 / TABS.length))} /></div>

          <div style={S.tabs}>
            {TABS.map((t, i) => (
              <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>

          {/* TAB 0: TERRENO */}
          {tab === 0 && (
            <>
              <div style={S.card}>
                <div style={S.cardTitle}>Datos del proyecto</div>
                <div style={S.grid2}>
                  <Field label="Nombre del proyecto"><input style={S.input} value={p.nombre} onChange={(e) => update({ nombre: e.target.value })} /></Field>
                  <Field label="Cliente / inversor"><input style={S.input} value={p.cliente} onChange={(e) => update({ cliente: e.target.value })} /></Field>
                </div>
              </div>

              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ ...S.cardTitle, marginBottom: 0 }}>Lotes del terreno</div>
                  <button style={{ ...S.btnGhost, color: gold, borderColor: gold + "55" }} onClick={agregarLote}>+ Agregar lote</button>
                </div>
                <div style={S.infoBox()}>
                  Si estás unificando varios lotes (doble, triple o cuádruple frente), cargá cada uno por separado. El sistema suma superficies y precios automáticamente para el análisis conjunto.
                </div>

                {p.lotes.map((lote, i) => (
                  <div key={i} style={{ ...S.normBlock, marginBottom: 10, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: gold }}>Lote {i + 1}{i === 0 ? " (principal)" : ""}</span>
                      {p.lotes.length > 1 && (
                        <button onClick={() => quitarLote(i)} style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: 11 }}>✕ Quitar</button>
                      )}
                    </div>
                    <div style={S.grid2}>
                      <Field label="Dirección"><input style={S.input} placeholder="Av. Forest 365, CABA" value={lote.direccion} onChange={(e) => actualizarLote(i, { direccion: e.target.value })} /></Field>
                      <Field label="Precio del lote (USD)"><input style={S.input} type="number" value={lote.precio} onChange={(e) => actualizarLote(i, { precio: +e.target.value })} /></Field>
                    </div>
                    <div style={S.grid2}>
                      <Field label="Frente (m)"><input style={S.input} type="number" value={lote.frente} onChange={(e) => actualizarLote(i, { frente: +e.target.value })} /></Field>
                      <Field label="Fondo (m)"><input style={S.input} type="number" value={lote.fondo} onChange={(e) => actualizarLote(i, { fondo: +e.target.value })} /></Field>
                    </div>
                  </div>
                ))}

                <div style={S.grid2}>
                  <Field label="Tipo de lote unificado">
                    <select style={S.select} value={p.tipLote} onChange={(e) => update({ tipLote: e.target.value })}>
                      <option value="entremedianeras">Entre medianeras</option>
                      <option value="esquina">Esquina</option>
                      <option value="doblefrente">Doble frente (unificado)</option>
                      <option value="triplefrente">Triple frente (unificado)</option>
                      <option value="cuadruplefrente">Cuádruple frente (unificado)</option>
                    </select>
                  </Field>
                  <Field label="Ancho de calle (m)"><input style={S.input} type="number" value={p.anchoCalle} onChange={(e) => update({ anchoCalle: +e.target.value })} /></Field>
                </div>

                <div style={{ ...S.normBlock, marginTop: "0.5rem" }}>
                  <CRow label="Superficie total unificada" value={fmtN(r.supTerreno) + " m²"} bold />
                  <CRow label="Frente total" value={fmtN(p.lotes.reduce((a, l) => a + (+l.frente || 0), 0)) + " m"} />
                  <CRow label="Precio terreno total" value={fmtUSD(r.precioTerrenoTotal)} gold />
                  <CRow label="Precio por m² terreno" value={fmtUSD(r.precioTerrenoTotal / (r.supTerreno || 1)) + "/m²"} />
                  <CRow label="Incidencia sobre vendibles (est.)" value={fmtUSD(r.incidenciaSobreVendibles) + "/m²"} gold />
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>Verificación automática de normativa</div>
                <div style={S.infoBox()}>
                  Verificá con IA qué tipología del Código Urbanístico (Ley 6099) aplica a la parcela unificada. Esto es una primera aproximación — siempre confirmá con la plancheta oficial del GCBA antes de avanzar con un proyecto.
                </div>
                <button style={{ ...S.btn, width: "100%", marginBottom: normResult || normError ? 12 : 0 }} onClick={handleVerificarNormativa} disabled={normLoading || !p.lotes[0]?.direccion}>
                  {normLoading ? "Buscando en el Código Urbanístico..." : "Verificar normativa con IA ↗"}
                </button>

                {normError && (
                  <div style={{ ...S.normBlock, borderColor: "#A32D2D" }}>
                    <div style={{ fontSize: 12, color: "#E25A5A" }}>{normError}</div>
                  </div>
                )}

                {normResult && (
                  <div style={{ ...S.normBlock, borderColor: normResult.confianza === "alta" ? "#3ABA77" : normResult.confianza === "media" ? gold : "#A32D2D" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: normResult.confianza === "alta" ? "#3ABA77" : normResult.confianza === "media" ? gold : "#E25A5A" }}>
                        Confianza: {normResult.confianza || "—"}
                      </span>
                    </div>
                    <div style={S.normRow}><span style={{ color: "#666" }}>Tipología</span><span style={{ color: gold }}>{normResult.tipologia}</span></div>
                    <div style={S.normRow}><span style={{ color: "#666" }}>Altura máx.</span><span>{normResult.hMax} m</span></div>
                    <div style={S.normRow}><span style={{ color: "#666" }}>Morfología</span><span>{normResult.morfologia}</span></div>
                    <div style={S.normRow}><span style={{ color: "#666" }}>Zona de uso</span><span>{normResult.zonaUso}</span></div>
                    <div style={{ ...S.normRow, borderBottom: "none" }}><span style={{ color: "#666" }}>Fuente</span><span style={{ fontSize: 10 }}>{normResult.fuente}</span></div>
                    {normResult.notas && <div style={{ fontSize: 11, color: "#888", marginTop: 8, fontStyle: "italic" }}>{normResult.notas}</div>}
                    <button style={{ ...S.btn, marginTop: 10, fontSize: 11 }} onClick={aplicarNormativa}>Aplicar y continuar →</button>
                  </div>
                )}
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>Panorama de zona / mercado</div>
                <div style={S.infoBox(gold)}>
                  Buscá precios actuales de venta en la zona (USD/m²), demanda por tipo de unidad y tendencia, para calibrar el mix de unidades y el precio objetivo.
                </div>
                <button style={{ ...S.btn, width: "100%", background: "#1E2028", color: gold, marginBottom: zonaResult || zonaError ? 12 : 0 }} onClick={handleAnalizarZona} disabled={zonaLoading || !p.lotes[0]?.direccion}>
                  {zonaLoading ? "Analizando mercado de la zona..." : "Generar panorama de zona ↗"}
                </button>

                {zonaError && (
                  <div style={{ ...S.normBlock, borderColor: "#A32D2D" }}>
                    <div style={{ fontSize: 12, color: "#E25A5A" }}>{zonaError}</div>
                  </div>
                )}

                {zonaResult && (
                  <div style={{ ...S.normBlock, borderColor: gold + "66" }}>
                    <CRow label="Zona analizada" value={zonaResult.zona} />
                    <CRow label="Precio promedio m²" value={fmtUSD(zonaResult.precioPromedioM2)} gold bold />
                    <CRow label="Rango de mercado" value={fmtUSD(zonaResult.precioPromedioM2Min) + " – " + fmtUSD(zonaResult.precioPromedioM2Max)} />
                    <div style={{ height: 1, background: gold + "33", margin: "8px 0" }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Por tipo de unidad</div>
                    {(zonaResult.porTipoUnidad || []).map((u, i) => (
                      <div key={i} style={{ ...S.normRow, alignItems: "flex-start" }}>
                        <span style={{ color: "#999" }}>{u.tipo}<span style={S.badge(u.demanda === "alta" ? "g" : u.demanda === "media" ? "a" : "r")}>{u.demanda}</span></span>
                        <span style={{ textAlign: "right" }}>{fmtUSD(u.precioM2)}/m²</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: "#888", marginTop: 10, fontStyle: "italic" }}>{zonaResult.tendencia}</div>
                    {zonaResult.perfilComprador && <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}><b style={{ color: "#888" }}>Perfil comprador:</b> {zonaResult.perfilComprador}</div>}
                    <button style={{ ...S.btn, marginTop: 10, fontSize: 11 }} onClick={aplicarPrecioZona}>Aplicar precio de venta sugerido →</button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button style={S.btn} onClick={() => setTab(1)}>Siguiente → Normativa</button>
              </div>
            </>
          )}

          {/* TAB 1: NORMATIVA */}
          {tab === 1 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Normativa CUR — Ley 6099</div>
              <div style={S.infoBox()}>El nuevo Código Urbanístico no usa FOT/FOS. Define tipologías con altura máxima, LFI, LIB y morfología edificable.</div>
              <div style={S.grid2}>
                <Field label="Tipología (Ley 6099)">
                  <select style={S.select} value={p.tipologia} onChange={(e) => {
                    const t = TIPOLOGIAS[e.target.value];
                    update({ tipologia: e.target.value, hMax: t?.hMax || p.hMax, morfologia: t?.morfologia || p.morfologia });
                  }}>
                    {Object.entries(TIPOLOGIAS).map(([k, v]) => <option key={k} value={k}>{k} — {v.label}</option>)}
                  </select>
                </Field>
                <Field label="Morfología"><input style={S.input} value={p.morfologia} onChange={(e) => update({ morfologia: e.target.value })} /></Field>
              </div>
              <div style={S.grid3}>
                <Field label="Altura máx. (m)"><input style={S.input} type="number" step="0.1" value={p.hMax} onChange={(e) => update({ hMax: +e.target.value })} /></Field>
                <Field label="Pisos totales"><input style={S.input} type="number" value={p.pisosReal} onChange={(e) => update({ pisosReal: +e.target.value })} /></Field>
                <Field label="Basamento (m)"><input style={S.input} type="number" value={p.basamento} onChange={(e) => update({ basamento: +e.target.value })} /></Field>
              </div>
              <div style={S.normBlock}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Parámetros calculados</div>
                <CRow label="LFI (Línea de Frente Interno)" value={fmtN(r.lfiCalc) + " m aprox."} />
                <CRow label="LIB (Línea Interna de Basamento)" value={fmtN(r.libCalc) + " m aprox."} />
              </div>

              <div style={{ ...S.cardTitle, marginTop: "1.25rem" }}>m² por sector</div>
              <div style={S.grid2}>
                <Field label="m² viviendas (cubierto total)"><input style={S.input} type="number" value={p.m2Viviendas} onChange={(e) => update({ m2Viviendas: +e.target.value })} /></Field>
                <Field label="m² locales / exteriores"><input style={S.input} type="number" value={p.m2Comercial} onChange={(e) => update({ m2Comercial: +e.target.value })} /></Field>
              </div>
              <div style={S.grid2}>
                <Field label="m² cocheras PB"><input style={S.input} type="number" value={p.m2CochPB} onChange={(e) => update({ m2CochPB: +e.target.value })} /></Field>
                <Field label="m² cocheras subsuelo"><input style={S.input} type="number" value={p.m2CochSS} onChange={(e) => update({ m2CochSS: +e.target.value })} /></Field>
              </div>
              <div style={S.grid3}>
                <Field label="m² comunes"><input style={S.input} type="number" value={p.m2Comunes} onChange={(e) => update({ m2Comunes: +e.target.value })} /></Field>
                <Field label="Cant. cocheras PB"><input style={S.input} type="number" value={p.cochPBQty} onChange={(e) => update({ cochPBQty: +e.target.value })} /></Field>
                <Field label="Cant. cocheras subsuelo"><input style={S.input} type="number" value={p.cochSSQty} onChange={(e) => update({ cochSSQty: +e.target.value })} /></Field>
              </div>
              <Field label="% vendible de viviendas">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="range" min="70" max="100" step="1" value={p.pctVendible} onChange={(e) => update({ pctVendible: +e.target.value })} style={S.slider} />
                  <span style={{ color: gold, fontWeight: 700, minWidth: 36 }}>{p.pctVendible}%</span>
                </div>
              </Field>
              <div style={{ ...S.normBlock, marginTop: "1rem" }}>
                <CRow label="m² total a construir" value={fmtN(r.m2TotalConst) + " m²"} />
                <CRow label="m² viviendas vendibles" value={fmtN(r.m2ViviendasVendibles) + " m²"} gold />
                <CRow label="m² total vendibles (ponderado)" value={fmtN(r.m2Vendibles) + " m²"} gold />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button style={S.btnGhost} onClick={() => setTab(0)}>← Volver</button>
                <button style={S.btn} onClick={() => setTab(2)}>Siguiente → Unidades</button>
              </div>
            </div>
          )}

          {/* TAB 2: UNIDADES */}
          {tab === 2 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Mix de unidades y precios de mercado</div>
              <div style={S.infoBox(gold)}>
                Valores referenciales para CABA. Usá "Análisis de mercado" en el panel derecho para verificar precios actuales de la zona específica.
              </div>
              {[
                { key: "mono", label: "Monoambiente", m2: "28–35 m²", demanda: "Alta rotación · Rentistas / Airbnb" },
                { key: "u1", label: "1 amb + cocina", m2: "38–45 m²", demanda: "Alta demanda · Profesionales jóvenes" },
                { key: "u2", label: "2 ambientes", m2: "50–65 m²", demanda: "Equilibrado · Familias jóvenes" },
                { key: "u3", label: "3 ambientes", m2: "70–90 m²", demanda: "Mayor ticket · Familias consolidadas" },
              ].map((u) => (
                <div key={u.key} style={S.unitCard(p.unitsMix[u.key] > 0)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.label}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{u.m2} · {u.demanda}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: gold, fontSize: 14 }}>{p.unitsMix[u.key]}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={p.unitsMix[u.key]} style={S.slider}
                    onChange={(e) => update({ unitsMix: { ...p.unitsMix, [u.key]: +e.target.value } })} />
                </div>
              ))}

              <div style={{ ...S.cardTitle, marginTop: "1.25rem" }}>Precios de venta (USD/m²)</div>
              <div style={S.grid2}>
                <Field label="Viviendas (USD/m²)"><input style={S.input} type="number" value={p.precioVivUSD} onChange={(e) => update({ precioVivUSD: +e.target.value })} /></Field>
                <Field label="Locales / exteriores (USD/m²)"><input style={S.input} type="number" value={p.precioExtUSD} onChange={(e) => update({ precioExtUSD: +e.target.value })} /></Field>
              </div>
              <div style={S.grid2}>
                <Field label="Cochera PB (USD/unidad)"><input style={S.input} type="number" value={p.precioCochPB} onChange={(e) => update({ precioCochPB: +e.target.value })} /></Field>
                <Field label="Cochera subsuelo (USD/unidad)"><input style={S.input} type="number" value={p.precioCochSS} onChange={(e) => update({ precioCochSS: +e.target.value })} /></Field>
              </div>
              <div style={{ ...S.normBlock, marginTop: "1rem" }}>
                <CRow label="Ingreso viviendas" value={fmtUSD(r.ingresoViv)} />
                <CRow label="Ingreso locales/exteriores" value={fmtUSD(r.ingresoExt)} />
                <CRow label="Ingreso cocheras PB" value={fmtUSD(r.ingresoCochPB)} />
                <CRow label="Ingreso cocheras SS" value={fmtUSD(r.ingresoCochSS)} />
                <CRow label="Ingreso total bruto" value={fmtUSD(r.ingresoTotal)} gold bold />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button style={S.btnGhost} onClick={() => setTab(1)}>← Volver</button>
                <button style={S.btn} onClick={() => setTab(3)}>Siguiente → Costos</button>
              </div>
            </div>
          )}

          {/* TAB 3: COSTOS */}
          {tab === 3 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Modelo de costos — por m² y totales</div>
              <div style={{ ...S.cardTitle, marginTop: 0, color: gold }}>Costos de construcción (USD/m²)</div>
              <div style={S.grid2}>
                <Field label="Viviendas (USD/m²)"><input style={S.input} type="number" value={p.costoVivM2} onChange={(e) => update({ costoVivM2: +e.target.value })} /></Field>
                <Field label="Locales / exteriores (USD/m²)"><input style={S.input} type="number" value={p.costoExtM2} onChange={(e) => update({ costoExtM2: +e.target.value })} /></Field>
              </div>
              <div style={S.grid2}>
                <Field label="Cochera PB (USD/m²)"><input style={S.input} type="number" value={p.costoCochPBM2} onChange={(e) => update({ costoCochPBM2: +e.target.value })} /></Field>
                <Field label="Cochera subsuelo (USD/m²)"><input style={S.input} type="number" value={p.costoCochSSM2} onChange={(e) => update({ costoCochSSM2: +e.target.value })} /></Field>
              </div>
              <div style={{ ...S.cardTitle, marginTop: "1.25rem", color: gold }}>Costos blandos (% sobre CDC)</div>
              <div style={S.grid3}>
                {[["Proyecto (%)", "pctProyecto"], ["Dirección (%)", "pctDireccion"], ["Gerenc. (%)", "pctGerenc"], ["Asesores (%)", "pctAsesores"], ["Administración (%)", "pctAdmin"], ["Desarrollo (%)", "pctDesarrollo"]].map(([l, k]) => (
                  <Field key={k} label={l}><input style={S.input} type="number" step="0.5" value={p[k]} onChange={(e) => update({ [k]: +e.target.value })} /></Field>
                ))}
              </div>
              <div style={{ ...S.cardTitle, marginTop: "1.25rem", color: gold }}>Gastos de ventas y otros</div>
              <div style={S.grid3}>
                <Field label="Marketing (%)"><input style={S.input} type="number" step="0.5" value={p.pctMarketing} onChange={(e) => update({ pctMarketing: +e.target.value })} /></Field>
                <Field label="Comisión venta (%)"><input style={S.input} type="number" step="0.5" value={p.pctComisionVenta} onChange={(e) => update({ pctComisionVenta: +e.target.value })} /></Field>
                <Field label="Escrit. + ret. IIGG (%)"><input style={S.input} type="number" step="0.5" value={p.pctEscrituracion} onChange={(e) => update({ pctEscrituracion: +e.target.value })} /></Field>
              </div>
              <div style={{ ...S.cardTitle, marginTop: "1.25rem", color: gold }}>Plusvalía — Ley 6062</div>
              <div style={S.grid3}>
                <Field label="Zona alícuota (1–4)">
                  <select style={S.select} value={p.alicuotaZona} onChange={(e) => update({ alicuotaZona: +e.target.value })}>
                    <option value={1}>Zona 1 — 20%</option><option value={2}>Zona 2 — 25%</option><option value={3}>Zona 3 — 27%</option><option value={4}>Zona 4 — 35%</option>
                  </select>
                </Field>
                <Field label="FOT CPU (código antiguo)"><input style={S.input} type="number" step="0.1" value={p.fotCPU} onChange={(e) => update({ fotCPU: +e.target.value })} /></Field>
                <Field label="Incidencia (UVA/m²)"><input style={S.input} type="number" value={p.inciUVA} onChange={(e) => update({ inciUVA: +e.target.value })} /></Field>
              </div>
              <div style={S.grid2}>
                <Field label="Valor UVA ($/UVA)"><input style={S.input} type="number" value={p.valorUVA} onChange={(e) => update({ valorUVA: +e.target.value })} /></Field>
                <Field label="Tipo de cambio ($/USD)"><input style={S.input} type="number" value={p.valorTC} onChange={(e) => update({ valorTC: +e.target.value })} /></Field>
              </div>
              <div style={{ ...S.cardTitle, marginTop: "1.25rem", color: gold }}>Terreno y derechos</div>
              <div style={S.grid3}>
                <Field label="Comisión compra terreno (%)"><input style={S.input} type="number" step="0.5" value={p.comisionCompraTerreno} onChange={(e) => update({ comisionCompraTerreno: +e.target.value })} /></Field>
                <Field label="Escrituración terreno (USD)"><input style={S.input} type="number" value={p.escTerreno} onChange={(e) => update({ escTerreno: +e.target.value })} /></Field>
                <Field label="Derechos construc. (USD/m²)"><input style={S.input} type="number" value={p.derechosConstruccionM2} onChange={(e) => update({ derechosConstruccionM2: +e.target.value })} /></Field>
              </div>

              <div style={S.normBlock}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Desglose de costos</div>
                {[
                  ["Costo directo construcción", r.cdcTotal],
                  ["Costos blandos (honorarios)", r.costosBlandos],
                  ["Terreno total (+ comis + escr.)", r.totalTerreno],
                  ["Plusvalía Ley 6062", r.plusvaliaUSD],
                  ["Derechos de construcción", r.derechosConstruccion],
                  ["Gastos de ventas", r.costoVentas],
                ].map(([l, v]) => <CRow key={l} label={l} value={fmtUSD(v)} />)}
                <div style={{ height: 1, background: gold + "33", margin: "6px 0" }} />
                <CRow label="COSTO TOTAL" value={fmtUSD(r.costoTotal)} bold />
                <CRow label="Costo/m² s/ CDC" value={fmtUSD(r.costoM2SinVentas) + "/m²"} />
                <CRow label="Incidencia tierra/m² construible" value={fmtUSD(r.incidenciaTierra) + "/m²"} />
                <CRow label="Incidencia tierra/m² vendible" value={fmtUSD(r.incidenciaSobreVendibles) + "/m²"} gold />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button style={S.btnGhost} onClick={() => setTab(2)}>← Volver</button>
                <button style={S.btn} onClick={() => setTab(4)}>Siguiente → Plan de ventas</button>
              </div>
            </div>
          )}

          {/* TAB 4: VENTAS */}
          {tab === 4 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Plan de ventas por fases</div>
              <div style={S.infoBox()}>Distribuí las ventas en tres fases: preventa (pozo), durante obra y terminado.</div>
              <div style={S.grid3}>
                <Field label="Preventa / pozo (%)"><input style={S.input} type="number" value={p.pctPreventa} onChange={(e) => update({ pctPreventa: +e.target.value })} /></Field>
                <Field label="Durante obra (%)"><input style={S.input} type="number" value={p.pctObra} onChange={(e) => update({ pctObra: +e.target.value })} /></Field>
                <Field label="Terminado (%)"><input style={S.input} type="number" value={p.pctTerminado} onChange={(e) => update({ pctTerminado: +e.target.value })} /></Field>
              </div>
              <div style={S.grid2}>
                <Field label="Descuento preventa (%)"><input style={S.input} type="number" value={p.descPreventa} onChange={(e) => update({ descPreventa: +e.target.value })} /></Field>
                <Field label="Sobreprecio terminado (%)"><input style={S.input} type="number" value={p.sobrePrecioTerminado} onChange={(e) => update({ sobrePrecioTerminado: +e.target.value })} /></Field>
              </div>

              <div style={S.normBlock}>
                {[
                  { fase: "Fase 1 — Preventa / Pozo", periodo: "Meses 1–6", badge: "a", ingresos: r.prevTotal, pctV: p.pctPreventa },
                  { fase: "Fase 2 — Durante obra", periodo: "Meses 7–24", badge: "a", ingresos: r.obraTotal, pctV: p.pctObra },
                  { fase: "Fase 3 — Terminado + cocheras", periodo: "Meses 24–30", badge: "g", ingresos: r.termTotal + r.ingresoCochPB + r.ingresoCochSS, pctV: p.pctTerminado },
                ].map((f, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1A1C24" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{f.fase}<span style={S.badge(f.badge)}>{f.periodo}</span></span>
                      <span style={{ color: gold, fontWeight: 700 }}>{fmtUSD(f.ingresos)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{f.pctV}% de las unidades</div>
                  </div>
                ))}
              </div>

              <div style={{ ...S.cardTitle, marginTop: "1.25rem" }}>Flujo de fondos anual</div>
              <div style={{ overflowX: "auto" }}>
                <table style={S.cashflowTable}>
                  <thead>
                    <tr style={S.tableHead}>
                      {["Concepto", "Año 1", "Año 2", "Año 3", "Año 4", "Año 5", "Total"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "Concepto" ? "left" : "right", fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Ingresos", values: r.ingresos, color: "#3ABA77" },
                      { label: "Egresos", values: r.egresos, color: "#E25A5A" },
                      { label: "Saldo", values: r.saldos, color: gold },
                      { label: "Saldo acumulado", values: r.acumulados, color: "#888" },
                    ].map((row) => (
                      <tr key={row.label} style={{ borderBottom: "1px solid #1A1C24" }}>
                        <td style={{ padding: "7px 10px", fontSize: 11, color: row.color, fontWeight: 600 }}>{row.label}</td>
                        {row.values.map((v, i) => <td key={i} style={{ padding: "7px 10px", textAlign: "right", fontSize: 11, color: v < 0 ? "#E25A5A" : row.color }}>{fmtUSD(v)}</td>)}
                        <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 11, fontWeight: 700, color: row.color }}>{fmtUSD(row.values.reduce((a, b) => a + b, 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ ...S.normBlock, marginTop: "1rem" }}>
                <CRow label="Máxima exposición de caja" value={fmtUSD(r.maxExposicion)} red />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <button style={S.btnGhost} onClick={() => setTab(3)}>← Volver</button>
                <button style={S.btn} onClick={() => setTab(5)}>Ver resumen ejecutivo →</button>
              </div>
            </div>
          )}

          {/* TAB 5: RESUMEN */}
          {tab === 5 && (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ ...S.cardTitle, marginBottom: 0 }}>Resumen ejecutivo</div>
                <button style={{ ...S.btn, fontSize: 11, padding: "8px 14px" }} onClick={handleDescargarPDF}>Descargar reporte PDF ↓</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
                {[
                  { val: fmtUSD(r.ingresoTotal), lbl: "Ingreso total bruto", g: true },
                  { val: fmtUSD(r.costoTotal), lbl: "Costo total" },
                  { val: fmtUSD(r.margen), lbl: "Margen neto", g: r.margen >= 0, red: r.margen < 0 },
                  { val: pctFmt(r.pctMargen), lbl: "Margen sobre ventas", g: r.pctMargen > 20 },
                  { val: pctFmt(r.roi), lbl: "ROI sobre inversión", g: r.roi > 25 },
                  { val: pctFmt(r.tirEstimada) + " anual", lbl: "TIR estimada" },
                  { val: fmtN(r.m2TotalConst) + " m²", lbl: "m² totales construidos" },
                  { val: fmtN(r.m2Vendibles) + " m²", lbl: "m² vendibles totales" },
                  { val: fmtUSD(r.incidenciaSobreVendibles) + "/m²", lbl: "Incidencia tierra", g: true },
                ].map((k, i) => (
                  <div key={i} style={{ background: "#0D0F14", border: "1px solid #1E2028", borderRadius: 8, padding: ".9rem", textAlign: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: k.red ? "#E25A5A" : k.g ? gold : "#E8E6DF" }}>{k.val}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{k.lbl}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...S.cardTitle, color: gold }}>Desglose completo</div>
              <CRow label="Incidencia tierra / m² construible" value={fmtUSD(r.incidenciaTierra) + "/m²"} />
              <CRow label="Incidencia tierra / m² vendible" value={fmtUSD(r.incidenciaSobreVendibles) + "/m²"} gold />
              <CRow label="Costo construcción / m²" value={fmtUSD(r.cdcTotal / r.m2TotalConst) + "/m²"} />
              <CRow label="Costo total / m² construible" value={fmtUSD(r.costoM2SinVentas) + "/m²"} />
              <CRow label="Precio venta viviendas" value={fmtUSD(p.precioVivUSD) + "/m²"} />
              <CRow label="Plusvalía Ley 6062" value={fmtUSD(r.plusvaliaUSD)} />
              <CRow label="Máxima exposición de caja" value={fmtUSD(r.maxExposicion)} red />

              <div style={{ ...S.infoBox(r.semaforo.color), marginTop: "1rem" }}>
                {r.semaforo.nivel === "viable" && `El proyecto muestra rentabilidad sólida. Con ${pctFmt(r.pctMargen)} de margen y TIR estimada de ${pctFmt(r.tirEstimada)} anual, es viable para avanzar.`}
                {r.semaforo.nivel === "ajustes" && `El proyecto es viable pero ajustado. Con ${pctFmt(r.pctMargen)} de margen, conviene revisar costos de construcción o negociar el precio del terreno.`}
                {r.semaforo.nivel === "bajo" && `Margen de ${pctFmt(r.pctMargen)} es bajo para el riesgo inmobiliario. Revisar precio de terreno, mix de unidades o precio de venta.`}
                {r.semaforo.nivel === "novalido" && "El proyecto no es viable en los parámetros actuales. Margen negativo. Requiere revisión profunda."}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "1rem" }}>
                <button style={S.btnGhost} onClick={() => setTab(4)}>← Volver</button>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ position: "sticky", top: 72, alignSelf: "start" }}>
          <div style={S.sideCard}>
            <div style={S.sideTitle}>Viabilidad</div>
            <div style={{ textAlign: "center", padding: ".5rem 0" }}>
              <div style={S.semCircle(r.semaforo.color)}>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {r.semaforo.nivel === "viable" ? "↑" : r.semaforo.nivel === "ajustes" ? "~" : r.semaforo.nivel === "bajo" ? "!" : r.semaforo.nivel === "novalido" ? "✕" : "?"}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{r.semaforo.label}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{pctFmt(r.pctMargen)} margen</div>
            </div>
          </div>

          <div style={S.sideCard}>
            <div style={S.sideTitle}>KPIs del proyecto</div>
            {[
              ["Superficie", fmtN(r.supTerreno) + " m²"],
              ["m² construibles", fmtN(r.m2TotalConst) + " m²"],
              ["m² vendibles", fmtN(r.m2Vendibles) + " m²"],
              ["Cocheras", p.cochPBQty + " PB / " + p.cochSSQty + " SS"],
              ["Costo total", fmtUSD(r.costoTotal)],
              ["Ingreso total", fmtUSD(r.ingresoTotal)],
            ].map(([l, v]) => (
              <div key={l} style={S.kpi}><span style={S.kpiLabel}>{l}</span><span style={S.kpiVal}>{v || "—"}</span></div>
            ))}
            <div style={{ ...S.kpi, borderBottom: "none" }}>
              <span style={{ ...S.kpiLabel, fontWeight: 600 }}>Margen neto</span>
              <span style={{ ...S.kpiVal, color: r.margen >= 0 ? gold : "#E25A5A" }}>{fmtUSD(r.margen)} ({pctFmt(r.pctMargen)})</span>
            </div>
          </div>

          <div style={{ ...S.sideCard, borderColor: gold + "44" }}>
            <div style={{ fontSize: 10, color: gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Análisis IA</div>
            <button style={{ ...S.btn, width: "100%", fontSize: 11, marginBottom: 6 }} onClick={() => setTab(0)}>
              Verificar normativa ↗
            </button>
            <button style={{ ...S.btn, width: "100%", fontSize: 11, background: "#1E2028", color: gold }} onClick={handleDescargarPDF}>
              Generar PDF inversores ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
