export const gold = "#C9A84C";

export const S = {
  app: { fontFamily: "'Inter', system-ui, sans-serif", background: "#0D0F14", minHeight: "100vh", color: "#E8E6DF" },
  header: { background: "#0D0F14", borderBottom: "1px solid #1E2028", padding: "0 2rem", display: "flex", alignItems: "center", gap: 16, height: 56, position: "sticky", top: 0, zIndex: 100 },
  logo: { color: gold, fontWeight: 700, fontSize: 15, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", background: "none", border: "none" },
  body: { display: "grid", gridTemplateColumns: "1fr 280px", gap: 0, maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1.5rem 4rem" },
  main: { paddingRight: "1.5rem", minWidth: 0 },
  tabs: { display: "flex", gap: 2, marginBottom: "1.5rem", background: "#13151C", borderRadius: 10, padding: 4, border: "1px solid #1E2028" },
  tab: (a) => ({ flex: 1, padding: "8px 6px", fontSize: 11, fontWeight: a ? 600 : 400, textAlign: "center", cursor: "pointer", background: a ? "#1E2028" : "transparent", color: a ? gold : "#666", border: "none", borderRadius: 7, transition: "all .2s", letterSpacing: "0.03em" }),
  card: { background: "#13151C", border: "1px solid #1E2028", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" },
  cardTitle: { fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 11, color: "#666", letterSpacing: "0.04em" },
  input: { padding: "8px 10px", fontSize: 13, background: "#0D0F14", border: "1px solid #1E2028", borderRadius: 7, color: "#E8E6DF", outline: "none", width: "100%", boxSizing: "border-box" },
  select: { padding: "8px 10px", fontSize: 13, background: "#0D0F14", border: "1px solid #1E2028", borderRadius: 7, color: "#E8E6DF", outline: "none", width: "100%", boxSizing: "border-box" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 },
  btn: { padding: "10px 20px", background: gold, color: "#0D0F14", fontWeight: 700, fontSize: 13, border: "none", borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" },
  btnGhost: { padding: "9px 16px", background: "transparent", color: "#666", fontSize: 12, border: "1px solid #1E2028", borderRadius: 8, cursor: "pointer" },
  infoBox: (c) => ({ background: "#13151C", borderLeft: `3px solid ${c || gold}`, borderRadius: "0 8px 8px 0", padding: ".7rem 1rem", fontSize: 12, color: "#888", marginBottom: "1rem" }),
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1A1C24", fontSize: 13 },
  rowLabel: { color: "#666" },
  rowVal: { fontWeight: 600, color: "#E8E6DF" },
  rowValGold: { fontWeight: 700, color: gold },
  rowValRed: { fontWeight: 600, color: "#E25A5A" },
  sideCard: { background: "#13151C", border: "1px solid #1E2028", borderRadius: 12, padding: "1rem", marginBottom: 12 },
  sideTitle: { fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" },
  kpi: { display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1A1C24", fontSize: 11 },
  kpiLabel: { color: "#555" },
  kpiVal: { fontWeight: 600, color: "#E8E6DF", fontSize: 12 },
  semCircle: (color) => ({ width: 60, height: 60, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto .6rem", fontSize: 20, transition: "background .4s" }),
  progress: { height: 3, background: "#1E2028", borderRadius: 2, marginBottom: "1.5rem", overflow: "hidden" },
  progressFill: (p) => ({ height: "100%", width: p + "%", background: gold, borderRadius: 2, transition: "width .3s" }),
  badge: (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: c === "g" ? "#0F2E1E" : c === "a" ? "#2E2208" : "#2E0F0F", color: c === "g" ? "#3ABA77" : c === "a" ? gold : "#E25A5A", marginLeft: 6 }),
  searchBox: { display: "flex", gap: 8, marginBottom: "1rem" },
  searchInput: { flex: 1, padding: "10px 12px", fontSize: 13, background: "#0D0F14", border: "1px solid #333", borderRadius: 8, color: "#E8E6DF", outline: "none" },
  searchBtn: { padding: "10px 16px", background: "#1E2028", color: gold, fontSize: 12, fontWeight: 700, border: "1px solid #333", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" },
  normBlock: { background: "#0D0F14", border: "1px solid #333", borderRadius: 8, padding: "1rem", marginTop: "0.75rem" },
  normRow: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: "1px solid #1A1C24" },
  unitCard: (sel) => ({ border: `1px solid ${sel ? gold : "#1E2028"}`, borderRadius: 8, padding: ".75rem", cursor: "pointer", background: sel ? "#1C1A0F" : "#0D0F14", marginBottom: 8, transition: "all .2s" }),
  slider: { width: "100%", accentColor: gold },
  tableHead: { background: "#1E2028", color: "#888", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" },
  cashflowTable: { width: "100%", borderCollapse: "collapse", fontSize: 11 },
  saveIndicator: (state) => ({
    fontSize: 11,
    color: state === "saved" ? "#3ABA77" : state === "saving" ? gold : state === "error" ? "#E25A5A" : "#444",
    display: "flex", alignItems: "center", gap: 6,
  }),
};

export const CRow = ({ label, value, gold: g, red: r, bold }) => (
  <div style={S.row}>
    <span style={S.rowLabel}>{label}</span>
    <span style={r ? S.rowValRed : g ? S.rowValGold : bold ? { ...S.rowVal, color: "#fff" } : S.rowVal}>{value}</span>
  </div>
);

export const Field = ({ label, children }) => (
  <div style={S.field}>
    <label style={S.label}>{label}</label>
    {children}
  </div>
);
