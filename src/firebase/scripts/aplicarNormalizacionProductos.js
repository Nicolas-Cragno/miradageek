// Temporal: importar manualmente en desarrollo. Importar NO ejecuta la migración.
import { db, auth } from '../firebaseConfig.js';
import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { calcularCambios } from './politicaNormalizacionProductos.js';

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  let ejecutando = false;
  window.aplicarNormalizacionProductos = async (confirmacion) => {
    if (confirmacion !== 'CONFIRMAR NORMALIZACION PRODUCTOS') {
      throw new Error('Confirmación incorrecta: no se inició la normalización.');
    }
    if (!auth.currentUser) throw new Error('Iniciá sesión antes de normalizar.');
    if (ejecutando) throw new Error('Ya hay una normalización en curso.');
    ejecutando = true;
    const resultado = {
      totalRevisados: 0, actualizados: 0, sinCambios: 0, errores: 0,
      pendienteAgregado: 0, reservadoAgregado: 0, edicionesAgregado: 0,
      monedaCostoPesosAARS: 0, monedaPrecioPesosAARS: 0, erroresDetalle: [],
    };
    try {
      // Enumeración desde servidor; las decisiones se toman al releer en transacción.
      const productos = await getDocsFromServer(collection(db, 'productos'));
      for (const producto of productos.docs) {
        try {
          const camposActualizados = await runTransaction(db, async transaction => {
            const actual = await transaction.get(producto.ref);
            if (!actual.exists()) return [];
            const cambios = calcularCambios(actual.data());
            const campos = Object.keys(cambios);
            if (!campos.length) return [];
            const update = Object.fromEntries(campos.map(campo => [campo, cambios[campo].nuevo]));
            transaction.update(producto.ref, update);
            return campos.map(campo => campo + (cambios[campo].anterior === 'pesos' ? 'PesosAARS' : 'Agregado'));
          });
          // Contar solo después del commit; el callback puede reintentarse.
          if (!camposActualizados.length) resultado.sinCambios++;
          else {
            resultado.actualizados++;
            for (const contador of camposActualizados) {
              resultado[contador] = (resultado[contador] || 0) + 1;
            }
          }
        } catch (error) {
          resultado.errores++;
          resultado.erroresDetalle.push({ id: producto.id, error: String(error?.code || error?.message || error) });
        }
        resultado.totalRevisados++;
        if (resultado.totalRevisados % 25 === 0) {
          console.warn('[PRODUCTOS NORMALIZACION] PROGRESO', {
            revisados: resultado.totalRevisados, total: productos.size,
            actualizados: resultado.actualizados, errores: resultado.errores,
          });
        }
      }
      console.warn('[PRODUCTOS NORMALIZACION] RESULTADO\n' + JSON.stringify(resultado, null, 2));
      return resultado;
    } catch (error) {
      console.error('[PRODUCTOS NORMALIZACION] No se pudo completar la ejecución:', error);
      throw error;
    } finally {
      ejecutando = false;
    }
  };
  window.aplicarNormalizacionProducto = async (idProducto) => {
    let iniciada = false;
    try {
      if (typeof idProducto !== 'string' || !idProducto.trim() || idProducto.includes('/')) {
        throw new Error('Indicá un ID de producto válido, sin barras.');
      }
      if (!auth.currentUser) throw new Error('Iniciá sesión antes de normalizar.');
      if (ejecutando) throw new Error('Ya hay una normalización en curso.');
      ejecutando = true;
      iniciada = true;
      const referencia = doc(db, 'productos', idProducto);
      const camposActualizados = await runTransaction(db, async transaction => {
        const actual = await transaction.get(referencia);
        if (!actual.exists()) throw new Error(`No existe el producto ${idProducto}.`);
        const anterior = actual.data();
        const cambios = calcularCambios(anterior);
        console.log('[PRODUCTO NORMALIZACION] ESTADO ANTERIOR', { idProducto, anterior });
        console.log('[PRODUCTO NORMALIZACION] CAMBIOS CALCULADOS', { idProducto, cambios });
        const campos = Object.keys(cambios);
        if (!campos.length) return [];
        const update = Object.fromEntries(campos.map(campo => [campo, cambios[campo].nuevo]));
        transaction.update(referencia, update);
        return campos;
      });
      const resultado = {
        idProducto,
        estado: camposActualizados.length ? 'actualizado' : 'sin cambios',
        camposActualizados,
      };
      console.log('[PRODUCTO NORMALIZACION] RESULTADO EXITOSO', resultado);
      return resultado;
    } catch (error) {
      console.error('[PRODUCTO NORMALIZACION] ERROR', { idProducto, error });
      throw error;
    } finally {
      if (iniciada) ejecutando = false;
    }
  };
  if (import.meta.hot) import.meta.hot.dispose(() => {
    delete window.aplicarNormalizacionProductos;
    delete window.aplicarNormalizacionProducto;
  });
}
