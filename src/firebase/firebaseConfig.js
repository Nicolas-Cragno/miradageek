import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
//import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCUGc6AS70rt5-VYUEYB6XES1JZm1hhmrw",
  authDomain: "geek-look.firebaseapp.com",
  projectId: "geek-look",
  storageBucket: "geek-look.firebasestorage.app",
  messagingSenderId: "875419538595",
  appId: "1:875419538595:web:4fc12e8102c2553e95db16",
  measurementId: "G-X83FX008MN",
};

const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// INICIO DIAGNOSTICO TEMPORAL PRODUCTOS (solo desarrollo y solo lectura).
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.diagnosticarEsquemaProductos = async () => {
    if (!auth.currentUser) throw new Error('[PRODUCTOS DEBUG] Iniciá sesión primero.');
    const { collection, getDocs } = await import('firebase/firestore');
    const campos = ['monedaCosto', 'monedaPrecio', 'pendiente', 'reservado', 'ediciones'];
    const ejemplos = () => Object.create(null);
    const moneda = () => ({ total: 0, tipos: { string: 0, number: 0, null: 0, otros: 0 },
      valoresInvalidos: Object.create(null), ejemplosPorAnomalia: ejemplos() });
    const cantidad = () => ({ total: 0, tipos: { number: 0, string: 0, null: 0, otros: 0 },
      negativos: 0, ejemplosPorAnomalia: ejemplos() });
    const informe = {
      totalProductos: 0, completos: 0, incompletos: 0,
      sospechosos: 0, productosSospechosos: 0, desdeCache: false,
      faltan: Object.fromEntries(campos.map(campo => [campo, 0])),
      sospechososPorCampo: {
        monedaCosto: moneda(), monedaPrecio: moneda(),
        pendiente: cantidad(), reservado: cantidad(),
        ediciones: { total: 0, tipos: { array: 0, object: 0, null: 0, otros: 0 },
          ejemplosPorAnomalia: ejemplos() },
      },
    };
    // Claves tipadas: no confundir null, "null", 0 y "0". Orden estable para mapas.
    const representar = (valor) => {
      if (valor === null) return 'null';
      if (typeof valor !== 'object') return typeof valor + ':' +
        (typeof valor === 'string' ? JSON.stringify(valor) : String(valor));
      if (Array.isArray(valor)) return 'array:[' + valor.map(representar).join(',') + ']';
      if (valor instanceof Date) return 'Date:' + valor.toISOString();
      return 'object:{' + Object.keys(valor).sort()
        .map(clave => JSON.stringify(clave) + ':' + representar(valor[clave])).join(',') + '}';
    };
    const patrones = new Map();
    const snapshot = await getDocs(collection(db, 'productos'));
    informe.desdeCache = snapshot.metadata.fromCache;
    for (const documento of snapshot.docs) {
      const datos = documento.data();
      const camposFaltantes = [];
      let incompleto = false;
      let sospechoso = false;
      informe.totalProductos++;
      for (const campo of campos) {
        if (!Object.hasOwn(datos, campo)) {
          incompleto = true;
          camposFaltantes.push(campo);
          informe.faltan[campo]++;
          continue;
        }
        const valor = datos[campo];
        const esMoneda = campo === 'monedaCosto' || campo === 'monedaPrecio';
        const esCantidad = campo === 'pendiente' || campo === 'reservado';
        const valido = esMoneda ? valor === 'ARS' || valor === 'USD'
          : esCantidad ? typeof valor === 'number' && valor >= 0 : Array.isArray(valor);
        if (valido) continue;
        sospechoso = true;
        informe.sospechosos++;
        const grupo = informe.sospechososPorCampo[campo];
        grupo.total++;
        const tipo = valor === null ? 'null' : Array.isArray(valor) ? 'array' : typeof valor;
        grupo.tipos[Object.hasOwn(grupo.tipos, tipo) ? tipo : 'otros']++;
        let anomalia = tipo;
        if (esMoneda) {
          anomalia = representar(valor);
          grupo.valoresInvalidos[anomalia] = (grupo.valoresInvalidos[anomalia] || 0) + 1;
        } else if (esCantidad && typeof valor === 'number') {
          anomalia = valor < 0 ? 'number:negativo' : 'number:NaN';
          if (valor < 0) grupo.negativos++;
        }
        const muestra = grupo.ejemplosPorAnomalia[anomalia] ||= [];
        if (muestra.length < 10) muestra.push(documento.id);
      }
      // El orden fijo de campos produce una clave única por conjunto, incluido [].
      const clavePatron = JSON.stringify(camposFaltantes);
      if (!patrones.has(clavePatron)) {
        patrones.set(clavePatron, { cantidad: 0, faltan: camposFaltantes, ejemplos: [] });
      }
      const patron = patrones.get(clavePatron);
      patron.cantidad++;
      if (patron.ejemplos.length < 10) patron.ejemplos.push(documento.id);
      informe[incompleto ? 'incompletos' : 'completos']++;
      if (sospechoso) informe.productosSospechosos++;
    }
    // sospechosos cuenta campos anómalos; productosSospechosos cuenta documentos únicos.
    console.warn('[PRODUCTOS DEBUG] RESUMEN SOSPECHOSOS\n' + JSON.stringify(informe, null, 2));
    console.warn('[PRODUCTOS DEBUG] FIN RESUMEN SOSPECHOSOS');
    const patronesEsquema = {
      totalPatrones: patrones.size,
      patrones: [...patrones.values()].sort((a, b) => b.cantidad - a.cantidad),
    };
    console.warn('[PRODUCTOS DEBUG] PATRONES DE ESQUEMA\n' + JSON.stringify(patronesEsquema, null, 2));
    console.warn('[PRODUCTOS DEBUG] FIN PATRONES DE ESQUEMA');
    return { ...informe, patronesEsquema };
  };
  if (import.meta.hot) {
    import.meta.hot.dispose(() => { delete window.diagnosticarEsquemaProductos; });
  }
}
// FIN DIAGNOSTICO TEMPORAL PRODUCTOS.