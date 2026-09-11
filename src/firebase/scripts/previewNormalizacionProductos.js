// Temporal: importar manualmente desde DevTools en la aplicación local.
import { db, auth } from '../firebaseConfig.js';
import { collection, getDocs } from 'firebase/firestore';
import { calcularCambios, crearInforme, registrarProducto } from './politicaNormalizacionProductos.js';

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.previewNormalizacionProductos = async () => {
    if (!auth.currentUser) throw new Error('Iniciá sesión antes del preview');
    const snapshot = await getDocs(collection(db, 'productos'));
    const informe = { ...crearInforme(), desdeCache: snapshot.metadata.fromCache, dryRun: true };
    for (const producto of snapshot.docs) {
      registrarProducto(informe, producto.id, calcularCambios(producto.data()));
    }
    console.warn('[PRODUCTOS PREVIEW] INICIO\n' + JSON.stringify(informe, null, 2));
    console.warn('[PRODUCTOS PREVIEW] FIN');
    return informe;
  };
  if (import.meta.hot) import.meta.hot.dispose(() => { delete window.previewNormalizacionProductos; });
}