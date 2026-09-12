// Política compartida por Node y el preview temporal; no realiza operaciones Firebase.
import { defaultsProducto } from '../../functions/productos/esquemaProducto.js';
export function calcularCambios(datos) {
  const cambios = {};
  for (const [campo, nuevo] of Object.entries(defaultsProducto())) {
    if (!Object.hasOwn(datos, campo)) cambios[campo] = { anterior: '<ausente>', nuevo };
  }
  for (const campo of ['monedaCosto', 'monedaPrecio']) {
    if (Object.hasOwn(datos, campo) && datos[campo] === 'pesos') {
      cambios[campo] = { anterior: 'pesos', nuevo: 'ARS' };
    }
  }
  return cambios;
}
export function crearInforme() {
  return { totalProductos: 0, productosAModificar: 0, sinCambios: 0,
    completosAntes: 0, completosDespues: 0,
    faltantesPorCampo: Object.fromEntries(Object.keys(defaultsProducto()).map(campo => [campo, 0])),
    pendienteAgregado: 0, reservadoAgregado: 0, edicionesAgregado: 0,
    monedaCostoPesosAARS: 0, monedaPrecioPesosAARS: 0, ejemplos: [] };
}
export function registrarProducto(informe, id, cambios) {
  informe.totalProductos++;
  const faltantes = Object.keys(cambios).filter(campo => cambios[campo].anterior === '<ausente>');
  if (!faltantes.length) informe.completosAntes++;
  informe.completosDespues++;
  for (const campo of faltantes) informe.faltantesPorCampo[campo]++;
  if (!Object.keys(cambios).length) informe.sinCambios++;
  else informe.productosAModificar++;
  for (const campo of Object.keys(cambios)) {
    const clave = campo + (cambios[campo].anterior === 'pesos' ? 'PesosAARS' : 'Agregado');
    informe[clave] = (informe[clave] || 0) + 1;
  }
  if (informe.ejemplos.length < 20) informe.ejemplos.push({ id, cambios });
}
