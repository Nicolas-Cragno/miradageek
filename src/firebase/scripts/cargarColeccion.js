import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { doc, setDoc, collection, addDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "../firebaseConfig.js";
import { prepararProductoNuevo } from "../../functions/productos/esquemaProducto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [, , archivoJson, nombreColeccion] = process.argv;

if (!archivoJson || !nombreColeccion) {
  console.log("\nUso:");
  console.log("node cargarColeccion.js archivo.json coleccion\n");
  process.exit(1);
}

const ruta = path.join(__dirname, "json", archivoJson);

try {
  const contenido = fs.readFileSync(ruta, "utf8");
  const datos = JSON.parse(contenido);

  console.log(
    `\nCargando ${datos.length} registros en "${nombreColeccion}"...\n`,
  );

  for (const elemento of datos) {
    const documento = nombreColeccion === "productos"
      ? prepararProductoNuevo(elemento)
      : { ...elemento, fecha: serverTimestamp() };
    if (nombreColeccion === "productos") {
      const referencia = elemento.id ? doc(db, nombreColeccion, elemento.id) : doc(collection(db, nombreColeccion));
      await runTransaction(db, async transaction => {
        if ((await transaction.get(referencia)).exists()) {
          throw new Error(`El producto ${referencia.id} ya existe; el alta no reemplaza documentos.`);
        }
        transaction.set(referencia, documento);
      });
    } else if (elemento.id) {
      await setDoc(doc(db, nombreColeccion, elemento.id), documento);
    } else {
      await addDoc(collection(db, nombreColeccion), documento);
    }

    console.log(`✔ ${elemento.id ?? "(id automático)"}`);
  }

  console.log("\n=================================");
  console.log("Carga finalizada correctamente.");
  console.log("=================================\n");
} catch (error) {
  console.error(error);
}
