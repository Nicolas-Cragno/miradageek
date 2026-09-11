// Política compartida por Node y el preview temporal; no realiza operaciones Firebase.
export function calcularCambios(datos) {
  const cambios = {};
  for (const [campo, nuevo] of Object.entries({ pendiente: 0, reservado: 0, ediciones: [] })) {
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
    pendienteAgregado: 0, reservadoAgregado: 0, edicionesAgregado: 0,
    monedaCostoPesosAARS: 0, monedaPrecioPesosAARS: 0, ejemplos: [] };
}
export function registrarProducto(informe, id, cambios) {
  informe.totalProductos++;
  if (!Object.keys(cambios).length) { informe.sinCambios++; return; }
  informe.productosAModificar++;
  for (const campo of Object.keys(cambios)) {
    informe[campo + (campo.startsWith('moneda') ? 'PesosAARS' : 'Agregado')]++;
  }
  if (informe.ejemplos.length < 20) informe.ejemplos.push({ id, cambios });
}