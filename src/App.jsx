import { useState } from "react";
import ListaProyectos from "./pages/ListaProyectos";
import EditorProyecto from "./pages/EditorProyecto";

export default function App() {
  const [proyectoId, setProyectoId] = useState(null);

  if (proyectoId) {
    return <EditorProyecto proyectoId={proyectoId} onVolver={() => setProyectoId(null)} />;
  }
  return <ListaProyectos onAbrirProyecto={setProyectoId} />;
}
