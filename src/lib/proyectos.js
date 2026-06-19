import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "proyectos_factibilidad";

export async function listarProyectos() {
  const q = query(collection(db, COLLECTION), orderBy("fechaModificacion", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerProyecto(id) {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function crearProyecto(data) {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    fechaCreacion: serverTimestamp(),
    fechaModificacion: serverTimestamp(),
  });
  return ref.id;
}

export async function actualizarProyecto(id, data) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    fechaModificacion: serverTimestamp(),
  });
}

export async function eliminarProyecto(id) {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

// Guarda o actualiza según si ya tiene id
export async function guardarProyecto(id, data) {
  if (id) {
    await actualizarProyecto(id, data);
    return id;
  }
  return crearProyecto(data);
}
