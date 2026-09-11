import { readFile } from 'node:fs/promises';
import { applicationDefault, initializeApp, deleteApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { calcularCambios, crearInforme, registrarProducto } from './politicaNormalizacionProductos.js';

const argumentos = process.argv.slice(2);
const DRY_RUN = !argumentos.includes('--apply') || argumentos.includes('--dry-run');
const PAGE_SIZE = 200;
async function main() {
  if (argumentos.some(arg => !['--apply', '--dry-run'].includes(arg))) throw new Error('Argumento desconocido');
  const config = JSON.parse(await readFile(new URL('../../../.firebaserc', import.meta.url), 'utf8'));
  const projectId = config.projects?.default;
  if (!projectId) throw new Error('Falta projects.default en .firebaserc');
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Este script no usa emulador');
  const app = initializeApp({ projectId, credential: applicationDefault() });
  try {
    const db = getFirestore(app);
    const informe = { proyecto: projectId, dryRun: DRY_RUN, ...crearInforme(), actualizados: 0, omitidos: 0, errores: 0 };
    console.warn('[PRODUCTOS] Inicio', { projectId, dryRun: DRY_RUN });
    let cursor;
    while (true) {
      let query = db.collection('productos').orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const pagina = await query.get();
      if (pagina.empty) break;
      for (const snapshot of pagina.docs) {
        const cambios = calcularCambios(snapshot.data());
        registrarProducto(informe, snapshot.id, cambios);
        if (!Object.keys(cambios).length) { informe.omitidos++; continue; }
        if (DRY_RUN) continue;
        try {
          const resultado = await db.runTransaction(async transaction => {
            const actual = await transaction.get(snapshot.ref);
            if (!actual.exists) return 'omitidos';
            const vigentes = calcularCambios(actual.data());
            if (!Object.keys(vigentes).length) return 'omitidos';
            const update = Object.fromEntries(Object.entries(vigentes).map(([campo, cambio]) => [campo, cambio.nuevo]));
            transaction.update(snapshot.ref, update);
            return 'actualizados';
          });
          informe[resultado]++;
        } catch (error) {
          informe.errores++;
          console.error(JSON.stringify({ id: snapshot.id, error: error.code || error.name }));
        }
      }
      cursor = pagina.docs.at(-1);
    }
    console.warn('[PRODUCTOS] RESUMEN\n' + JSON.stringify(informe, null, 2));
    if (informe.errores) process.exitCode = 1;
  } finally { await deleteApp(app); }
}
main().catch(error => {
  console.error('[PRODUCTOS] Ejecución incompleta:', error.code || error.name, error.message);
  process.exitCode = 1;
});