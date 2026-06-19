import { useEffect, useState } from "react";
import { listarProyectos, eliminarProyecto, crearProyecto } from "../lib/proyectos";
import { DEFAULT_PROJECT, calcularFactibilidad, fmtUSD, pctFmt } from "../lib/factibilidad";

const gold = "#C9A84C";

export default function ListaProyectos({ onAbrirProyecto }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [clienteNuevo, setClienteNuevo] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarProyectos();
      setProyectos(data);
    } catch (e) {
      setError("No se pudo conectar a la base de datos. Verificá la configuración de Firebase.");
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async () => {
    if (!nombreNuevo.trim()) return;
    try {
      const id = await crearProyecto({
        ...DEFAULT_PROJECT,
        nombre: nombreNuevo,
        cliente: clienteNuevo,
      });
      onAbrirProyecto(id);
    } catch (e) {
      setError("No se pudo crear el proyecto: " + e.message);
    }
  };

  const handleEliminar = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer.")) return;
    await eliminarProyecto(id);
    cargar();
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#0D0F14", minHeight: "100vh", color: "#E8E6DF" }}>
      <header style={{ borderBottom: "1px solid #1E2028", padding: "0 2rem", display: "flex", alignItems: "center", height: 56 }}>
        <span style={{ color: gold, fontWeight: 700, fontSize: 15, letterSpacing: "0.12em", textTransform: "uppercase" }}>AGF · Factibilidad</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#444" }}>Desarrollos Inmobiliarios · CABA</span>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Mis proyectos</h1>
            <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>Análisis de factibilidad guardados</p>
          </div>
          <button
            style={{ padding: "10px 18px", background: gold, color: "#0D0F14", fontWeight: 700, fontSize: 13, border: "none", borderRadius: 8, cursor: "pointer" }}
            onClick={() => setCreando(true)}
          >
            + Nuevo proyecto
          </button>
        </div>

        {creando && (
          <div style={{ background: "#13151C", border: "1px solid " + gold + "44", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Nuevo análisis</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <input
                placeholder="Nombre del proyecto (ej: Triple frente Villa Crespo)"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                style={{ padding: "9px 12px", fontSize: 13, background: "#0D0F14", border: "1px solid #1E2028", borderRadius: 7, color: "#E8E6DF", outline: "none" }}
              />
              <input
                placeholder="Cliente / inversor (opcional)"
                value={clienteNuevo}
                onChange={(e) => setClienteNuevo(e.target.value)}
                style={{ padding: "9px 12px", fontSize: 13, background: "#0D0F14", border: "1px solid #1E2028", borderRadius: 7, color: "#E8E6DF", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setCreando(false)} style={{ padding: "8px 16px", background: "transparent", color: "#666", fontSize: 12, border: "1px solid #1E2028", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleCrear} style={{ padding: "8px 16px", background: gold, color: "#0D0F14", fontWeight: 700, fontSize: 12, border: "none", borderRadius: 8, cursor: "pointer" }}>Crear y abrir</button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#2E0F0F", border: "1px solid #A32D2D", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem", fontSize: 13, color: "#E25A5A" }}>
            {error}
          </div>
        )}

        {loading && <div style={{ color: "#666", fontSize: 13 }}>Cargando proyectos...</div>}

        {!loading && !error && proyectos.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#444" }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Todavía no hay proyectos guardados</div>
            <div style={{ fontSize: 12 }}>Creá tu primer análisis de factibilidad con el botón de arriba</div>
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {proyectos.map((p) => {
            let r = null;
            try { r = calcularFactibilidad(p); } catch (e) { /* proyecto incompleto */ }
            return (
              <div
                key={p.id}
                onClick={() => onAbrirProyecto(p.id)}
                style={{ background: "#13151C", border: "1px solid #1E2028", borderRadius: 10, padding: "1rem 1.25rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color .2s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = gold + "66"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1E2028"}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre || "Proyecto sin nombre"}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                    {p.direccion || "Sin dirección"} {p.cliente ? "· " + p.cliente : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {r && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: r.semaforo.color }}>{pctFmt(r.pctMargen)}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>{fmtUSD(r.margen)}</div>
                    </div>
                  )}
                  <button
                    onClick={(e) => handleEliminar(p.id, e)}
                    style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: 12, padding: "4px 8px" }}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
