// Temporal: solo lectura; importar desde DevTools en la aplicacion local.
import { db, auth } from '../firebaseConfig.js';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { calcularCambios, crearInforme, registrarProducto } from './politicaNormalizacionProductos.js';

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.previewNormalizacionProductos = async () => {
    if (!auth.currentUser) throw new Error('Inicia sesion antes del preview');
    const snapshot = await getDocsFromServer(collection(db, 'productos'));
    const informe = { ...crearInforme(), dryRun: true, desdeCache: false };
    for (const producto of snapshot.docs) {
      registrarProducto(informe, producto.id, calcularCambios(producto.data()));
    }
    window.ultimoPreviewNormalizacionProductos = informe;
    const { ejemplos, ...resumen } = informe;
    console.warn('[PRODUCTOS PREVIEW] RESUMEN\n' + JSON.stringify(resumen, null, 2));
    for (const ejemplo of ejemplos) console.warn('[PRODUCTOS PREVIEW] EJEMPLO\n' + JSON.stringify(ejemplo, null, 2));
    return informe;
  };
  if (import.meta.hot) import.meta.hot.dispose(() => {
    delete window.previewNormalizacionProductos;
    delete window.ultimoPreviewNormalizacionProductos;
  });
}
