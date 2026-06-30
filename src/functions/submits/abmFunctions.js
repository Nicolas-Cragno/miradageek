import { db } from "../../firebase/firebaseConfig";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

export async function agregar(collectionName, data) {
  try {
    const ref = collection(db, collectionName);
    const docRef = await addDoc(ref, data);

    return docRef.id;
  } catch (error) {
    console.error("[Firestore] Error agregando:", error);
    throw error;
  }
}

export async function modificar(collectionName, id, data) {
  try {
    const ref = doc(db, collectionName, id);
    await updateDoc(ref, data);

    return true;
  } catch (error) {
    console.error("[Firestore] Error modificando:", error);
    throw error;
  }
}
