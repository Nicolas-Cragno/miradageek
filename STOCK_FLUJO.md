INFORME DEL 9/9/26 SOBRE EL FLUJO DEL STOCK (MOVIMIENTOS, ALTAS Y BAJAS).

---------------------------------------------------- TIPOS DE STOCK
1. STOCK FÍSICO: productos.stock representa la existencia total. Los movimientos actuales modifican stockSucursal y recalculan stock sumando sus sucursales.

2. RESERVADO: unidades de ventas que todavía falta entregar. Crear una venta pendiente aumenta reservado; entregarla reduce simultáneamente reservado y stock físico.

3. PENDIENTE: unidades de compras que todavía falta recibir. Crear una compra pendiente aumenta pendiente; recibirla reduce pendiente y aumenta stock físico.

La anulación es asimétrica: una venta permite reingresar lo entregado, opcionalmente. Una compra anulada conserva lo recibido y solamente libera lo que faltaba recibir.

El informe describe el código local actual y las reglas del repositorio. No consulté datos de producción ni verifiqué qué versión está desplegada. No modifiqué archivos ni ejecuté operaciones de escritura.

Los cuatro recorridos
ALTA / BAJA MANUAL
Productos → “Ajuste stock”
↓
Section.ajusteStock() abre Form con camposStock
↓
Usuario selecciona tipo, sucursal y productos
↓
InputForm → ListStockForm.agregarItem()
  INGRESO: diferencia = +abs(cantidad)
  EGRESO:  diferencia = -abs(cantidad)
  AJUSTE:  diferencia = stock deseado - stock mostrado
↓
Form.handleSubmit()
↓
submit() → guardarOperacion() → guardarMovimientoManual()
↓
runTransaction
  READ productos involucrados
  READ contadores/stock y contadores/detalleStock
  Validar diferencias y distribución por sucursal
  UPDATE productos.stockSucursal y productos.stock
  UPDATE ambos contadores
  SET stock/ST-...
  SET detalleStock/DS-... por producto
↓
Firestore evalúa las reglas de todas las escrituras
↓
Commit conjunto → confirmación → actualización visual por onSnapshot
COMPRA
Form + ListForm → submit → guardarOperacion → guardarOperacionNucleo
↓
runTransaction de creación
  Crear compra y detalleCompras
  Si PENDIENTE:
    cantidadCumplida = 0
    producto.pendiente += cantidad
    stock físico sin cambio
  Si “Ya recibida”:
    cantidadCumplida = cantidad
    stockSucursal += cantidad; recalcular stock
    crear stock + detalleStock
  Actualizar costo/monedaCosto del producto
  Actualizar contadores correspondientes
↓
Commit
↓
Más adelante: “Registrar cumplimiento” → showFulfillment
↓
registrarCumplimiento → otra runTransaction
  cantidadCumplida += cantidad recibida ahora
  pendiente -= cantidad recibida ahora
  stockSucursal += cantidad recibida ahora; recalcular stock
  estado = PARCIAL o COMPLETADA
  crear movimiento y detalles; actualizar contadores
↓
Commit
VENTA
Form + ListForm → submit → guardarOperacion → guardarOperacionNucleo
↓
runTransaction de creación
  Crear venta y detalleVentas con costo histórico
  Si PENDIENTE:
    cantidadCumplida = 0
    producto.reservado += cantidad
    stock físico sin cambio
  Si “Ya entregada”:
    cantidadCumplida = cantidad
    stockSucursal -= cantidad; recalcular stock
    registrar cumplimiento y movimiento de stock
  Actualizar precio/monedaPrecio del producto
  Calcular estadísticas y actualizar canales si hay cambios
  Actualizar contadores correspondientes
↓
Commit
↓
Más adelante: “Registrar cumplimiento” → showFulfillment
↓
registrarCumplimiento → otra runTransaction
  cantidadCumplida += cantidad entregada ahora
  reservado -= cantidad entregada ahora
  stockSucursal -= cantidad entregada ahora; recalcular stock
  agregar evento a cumplimientos
  estado = PARCIAL o COMPLETADA
  crear movimiento; actualizar contadores y estadísticas
↓
Commit
ANULACIÓN
AccionesOperacion.anular()
↓
Pedir motivo
↓
Si es venta con entregas: preguntar si reingresa mercadería
↓
anularOperacion → runTransaction
  READ operación, detalles activos y productos
  restante = cantidad - cantidadCumplida

  COMPRA:
    pendiente -= restante
    stock físico sin cambio

  VENTA:
    reservado -= restante
    si se confirmó reingreso:
      stockSucursal += cantidadCumplida; recalcular stock
      crear movimiento REINGRESO y sus detalles
      actualizar contadores y estadísticas correspondientes

  UPDATE operación: ANULADA + detalleEstado
  Los detalleCompras/detalleVentas permanecen sin modificación
↓
Reglas → commit conjunto
Tabla de efectos
N es la cantidad de la acción; R, lo que falta cumplir; C, lo ya cumplido. La columna sucursal corresponde a la sucursal de la operación.
Acción	STOCK	STOCK SUCURSAL	RESERVADO	PENDIENTE
Alta manual	+N	+N	SIN CAMBIO	SIN CAMBIO
Baja manual	-N	-N	SIN CAMBIO	SIN CAMBIO
Crear venta pendiente	SIN CAMBIO	SIN CAMBIO	+N	SIN CAMBIO
Crear venta ya entregada	-N	-N	SIN CAMBIO	SIN CAMBIO
Cumplir venta	-N	-N	-N	SIN CAMBIO
Anular venta sin reingreso	SIN CAMBIO	SIN CAMBIO	-R	SIN CAMBIO
Anular venta con reingreso	+C	+C	-R	SIN CAMBIO
Crear compra pendiente	SIN CAMBIO	SIN CAMBIO	SIN CAMBIO	+N
Crear compra ya recibida	+N	+N	SIN CAMBIO	SIN CAMBIO
Cumplir compra	+N	+N	SIN CAMBIO	-N
Anular compra	SIN CAMBIO	SIN CAMBIO	SIN CAMBIO	-R
Transferir entre sucursales	SIN CAMBIO	Origen -N; destino +N	SIN CAMBIO	SIN CAMBIO


Precisión: el servicio no calcula siempre stock anterior ± N: lo reemplaza por la suma de la distribución actualizada. Los efectos de la tabla presuponen que el total anterior coincide con esa distribución.
1. Modelo del producto
Campo	Significado actual	Cuándo aumenta	Cuándo disminuye	Quién lo modifica
stock	Existencia física total	Ingreso, ajuste positivo, recepción, venta anulada con reingreso	Egreso, ajuste negativo, entrega	Servicio de operaciones; inicialización al crear producto
stockSucursal	Distribución física por sucursal	Mismos ingresos, en la sucursal elegida; transferencia entrante	Mismos egresos; transferencia saliente	Helpers de distribución usados por el servicio
reservado	Cantidad global aún comprometida en ventas	Alta pendiente; edición que aumenta lo restante	Entrega; anulación; edición que reduce lo restante	Guardado de ventas, cumplimiento y anulación
pendiente	Cantidad global aún esperada de compras	Alta pendiente; edición que aumenta lo restante	Recepción; anulación; edición que reduce lo restante	Guardado de compras, cumplimiento y anulación


disponible se calcula en ProductosContext:
disponible = Number(stock ?? 0) - Number(reservado ?? 0)
No se guarda mediante el formulario actual. Tampoco suma las compras pendientes.
Reservado y pendiente no están separados por sucursal. La sucursal pertenece al encabezado de cada compra/venta y determina dónde se realiza el movimiento físico.
La estructura que construye el código es:
stockSucursal: [
  {
    sucursal: "SC-A0001",
    stock: 12
  },
  {
    sucursal: "SC-A0002",
    stock: 5
  }
]
Los números son ilustrativos; los campos son los reales.
normalizarStockSucursal() considera válida una distribución si es un array no vacío y cada elemento tiene sucursal string y stock convertible a número finito. Devuelve objetos con esas dos propiedades y convierte el stock a número.
Si la distribución es inválida o inexistente:
- Solo permite continuar cuando la sucursal del movimiento es SC-A0001 y está incluida en las sucursales disponibles.
- Construye una distribución asignando todo el producto.stock a esa sucursal histórica.
- En otra sucursal, lanza un error.
actualizarStockSucursal() modifica la entrada existente o agrega una nueva y suma todas las entradas para obtener stock.
Al crear un producto, guardarOperacion() inicializa:
stock: 0
pendiente: 0
reservado: 0
stockSucursal: sucursalesDisponibles.map(sucursal => ({
  sucursal,
  stock: 0
}))
El formulario comercial del producto tiene los cuatro campos de inventario con form: false. Existen dos alertas de “stock inicial” en alerts.js, pero no encontré llamadas a ellas: actualmente crear un producto no dispara ese ingreso.
Referencias: [modeloOperaciones.js (line 75)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/modeloOperaciones.js:75), [ProductosContext.jsx (line 19)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/ProductosContext.jsx:19), [abmFunctions.js (line 136)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/submits/abmFunctions.js:136).
2. Alta y baja manual, paso a paso
1. Desde Productos se abre “Ajuste stock”. El mismo formulario ofrece INGRESO, EGRESO y AJUSTE; el valor inicial es AJUSTE. Los textos antiguos ALTA y BAJA se normalizan a ingreso y egreso.
2. El usuario selecciona sucursal, producto y cantidad. Para ajuste introduce el stock deseado.
3. ListStockForm.agregarItem() prepara idProducto, descripcion, stockActual, stockNuevo y diferencia. Reemplaza la fila si el producto ya estaba agregado.
4. La columna Nuevo también es editable. Al editarla se recalcula diferencia = nuevo - stockActual.
5. La interfaz limita el movimiento a 8 productos. Form.handleSubmit() vuelve a verificar ese límite, identifica al usuario y valida campos requeridos.
6. submit() separa el encabezado de los detalles. guardarOperacion() deriva inmediatamente a guardarMovimientoManual().
7. Antes de la transacción, el servicio valida usuario interno, sucursal, tipo permitido y al menos un producto.
8. Dentro de la transacción relee cada producto, verifica existencia y duplicados, y lee ambos contadores.
9. Para cada fila valida una diferencia finita y distinta de cero, positiva para ingreso y negativa para egreso.
10. Normaliza la distribución, aplica la diferencia a la sucursal y recalcula el total. Usa la diferencia recibida; no impone directamente el stockNuevo mostrado en el formulario.
11. Si el total o la sucursal resultan negativos, lanza stock-negativo, salvo que se haya autorizado continuar.
12. Actualiza los productos, ambos contadores y crea el movimiento con sus detalles.
13. Firestore evalúa las reglas. Si una escritura se rechaza, no se confirma parcialmente el movimiento.
14. Si se produjo stock-negativo, el formulario pregunta si continuar y ejecuta una nueva transacción con permitirNegativo: true.
15. Tras el éxito muestra confirmación y cierra. Las suscripciones de productos actualizan la pantalla.
Documentos persistidos:
stock/{ST-...}: {
  id,
  tipo,
  sucursal,
  detalle,
  usuario,
  origenTipo: "manual", // valor predeterminado
  origenId: "",        // valor predeterminado
  fecha
}

detalleStock/{DS-...}: {
  stock: movimientoId,
  idProducto,
  descripcion,
  cantidad: diferencia, // con signo
  stockAnterior,
  stockNuevo,
  tipo,
  fecha
}
En el movimiento manual, stockAnterior y stockNuevo son valores de la sucursal.
stock es aquí el nombre de la colección de encabezados; detalleStock.stock es el ID del movimiento, no una cantidad.
Referencias: [Section.jsx (line 58)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/sections/Section.jsx:58), [ListStockForm.jsx (line 31)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/formularios/ListStockForm.jsx:31), [guardarMovimientoManual (line 279)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/operacionesService.js:279).
3. Ventas, compras y estados
Creación pendiente
El formulario y ListForm construyen filas con:
{
  idProducto,
  descripcion,
  cantidad,
  precio,
  moneda,
  cantidadCumplida: 0
}
Si se agrega nuevamente un producto, ListForm suma su cantidad y actualiza el precio de esa fila.
Antes de guardar, Form obtiene la cotización oficial para las operaciones nuevas, incluso si están expresadas en ARS. En ventas con nuevos detalles cuyo costo está en USD, obtiene además la cotización del costo. Esas consultas ocurren fuera de la transacción.
Dentro de guardarOperacionNucleo():
- Valida detalles no vacíos, producto, cantidad positiva, precio no negativo, cumplimiento entre cero y cantidad, y ausencia de productos duplicados.
- Lee productos y contadores.
- En ventas lee también los canales necesarios.
- Fuerza cantidadCumplida = 0 para una creación pendiente.
- Crea encabezado y detalles.
- Aumenta reservado en ventas o pendiente en compras.
- No crea movimiento físico de stock.
Además, guardar la operación puede modificar datos comerciales del producto:
- Venta: precio, monedaPrecio y ediciones.
- Compra: costo, monedaCosto y ediciones.
Esto sucede al guardar, aunque la operación esté pendiente. El costo de compra se toma del precio de su detalle; no se calcula un costo promedio ponderado.
Los detalles se guardan en colecciones independientes:
- detalleCompras/{id} contiene compra: idCompra.
- detalleVentas/{id} contiene venta: idVenta.
Los arrays que se ven dentro de las operaciones en React son asociaciones construidas por los contexts, no arrays de detalles escritos dentro del encabezado.
Los detalles de venta también conservan costo, monedaCosto, valorDivisaCosto, costoEnPesos y cumplimientos.
Cumplimiento parcial o total
AccionesOperacion.cumplir() abre showFulfillment(). Se ingresa la cantidad adicional que se recibe/entrega ahora, por detalle; no el acumulado final.
registrarCumplimiento():
1. Relee el encabezado.
2. Rechaza operaciones anuladas y operaciones históricas sin estado.
3. Relee los detalles cuyos IDs recibió desde la operación de la interfaz; conserva los existentes y activos.
4. Lee sus productos, contadores de movimiento y, cuando corresponde, canales de venta.
5. Verifica que cada cantidad solicitada no sea negativa ni supere lo restante.
6. Suma esa cantidad a cantidadCumplida.
7. Resta la misma cantidad de pendiente o reservado; si ese campo resultaría negativo, aborta.
8. Aplica el movimiento físico en la sucursal del encabezado.
9. Actualiza los detalles afectados y los productos.
10. Recalcula estado, registra su transición si cambió y crea stock/detalleStock.
11. En ventas agrega { fecha, cantidad } a cumplimientos y actualiza estadísticas cuando la venta ya tiene una huella versionada.
12. Confirma todo conjuntamente.
Completar no agrega un segundo descuento o ingreso. El último cumplimiento mueve únicamente lo que se recibe/entrega en ese momento.
estadoSegunDetalles() calcula:
Condición	Estado
Suma cumplida = 0	PENDIENTE
Suma cumplida > 0 y menor que la solicitada	PARCIAL
Total solicitado > 0 y suma cumplida ≥ total solicitado	COMPLETADA


Por ejemplo, una venta de 10 unidades entregada en dos veces:
Paso	Cambio stock	Cambio reservado	Cantidad cumplida	Estado
Crear	0	+10	0	PENDIENTE
Entregar 4	-4	-4	4	PARCIAL
Entregar 6	-6	-6	10	COMPLETADA


Para una compra de 10 recibida en 4 y 6, los cambios físicos son +4 y +6, mientras pendiente baja en esas mismas cantidades.
Creación directamente completada
Los formularios ofrecen:
- Compra: “Ya recibida”.
- Venta: “Ya entregada”.
En ese caso, la transacción de creación pone cantidadCumplida = cantidad, realiza inmediatamente el movimiento físico y crea su registro. El incremento neto de reservado/pendiente es cero.
Edición de cantidades
Editar una operación conserva el cumplimiento anterior y calcula, por producto:
cambio de obligación =
  restante nuevo - restante anterior
Ese cambio se aplica a reservado o pendiente. No genera movimientos físicos por la edición.
El servicio impide:
- Editar una operación anulada.
- Reducir una cantidad por debajo de lo ya cumplido.
- Cambiar el producto de un detalle que ya tuvo cumplimiento.
- Eliminar un detalle que ya tuvo cumplimiento.
Los detalles eliminados sin cumplimiento quedan con activo: false; no se borran.
Una operación completada puede volver a parcial al aumentar cantidades. Una parcial puede quedar completada al reducir lo solicitado hasta lo ya cumplido. Ambas transiciones ocurren sin otro movimiento físico.
En operaciones históricas sin estado, el código interpreta que estaban completadas y que sus cantidades ya estaban cumplidas.
Referencias: [guardarOperacionNucleo (line 519)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/operacionesService.js:519), [registrarCumplimiento (line 1033)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/operacionesService.js:1033), [estadoSegunDetalles (line 42)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/modeloOperaciones.js:42).
4. Qué revierte la anulación
Situación	Anular venta	Anular compra
Nunca tuvo cumplimiento	Libera toda la reserva; no mueve stock	Libera todo lo pendiente; no mueve stock
Cumplimiento parcial	Libera lo restante; opcionalmente reingresa todo lo entregado	Libera lo restante; conserva todo lo recibido
Completada	Reserva restante cero; opcionalmente reingresa todo lo entregado	Pendiente restante cero; conserva todo lo recibido
Stock insuficiente para retirar una compra recibida	No aplica	No se intenta retirar; no existe esa validación en esta anulación


La opción de reingreso de venta es un booleano: devuelve todo lo cumplido, no permite elegir una devolución parcial.
anularOperacion() conserva los detalles, sus cantidades cumplidas y los eventos de cumplimiento. Actualiza el encabezado a ANULADA y agrega motivo, fecha, usuario y transición a detalleEstado.
En ventas con estadísticas:
- Sin reingreso conserva la huella estadística.
- Con reingreso calcula una nueva huella usando temporalmente cumplimientos vacíos y aplica la diferencia a los canales.
- No borra los eventos de los documentos detalleVentas.
En compras no revierte costo ni moneda del producto. En ventas tampoco restaura precio ni moneda anteriores.
La interfaz oculta las acciones de una operación anulada y el servicio rechaza una segunda anulación. No investigué el 403 conocido.
Referencia: [anularOperacion (line 1266)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/operacionesService.js:1266).
5. Límites de cada transacción
Cada fila representa una sola runTransaction().
Operación	READ dentro de la transacción	Escrituras dentro de la transacción
Crear producto	contadores/productos	UPDATE contador; SET producto con inventario cero
Editar datos comerciales del producto	No relee el producto en esta rama genérica	UPDATE producto con campos del formulario
Movimiento manual	Productos de las filas; contadores/stock; contadores/detalleStock	UPDATE productos y contadores; SET encabezado de stock y un detalle por producto
Transferencia	Producto; ambos contadores de stock	UPDATE distribución y total del producto; UPDATE contadores; SET un movimiento y un detalle
Crear compra pendiente	contadores/compras; contadores/detalleCompras; productos	UPDATE contadores; SET compra y detalles; UPDATE pendiente y datos comerciales de productos
Crear venta pendiente	contadores/ventas; contadores/detalleVentas; productos; canales seleccionado y general	UPDATE contadores; SET venta y detalles; UPDATE reservado y datos comerciales; UPDATE canales si hay cambios reales
Crear compra/venta completada	Las lecturas del alta pendiente más ambos contadores de stock	Las escrituras del alta más stock físico, contadores de stock, movimiento y detalles
Editar compra/venta	Encabezado; contador de detalles; productos de detalles anteriores y nuevos; canales en ventas	UPDATE encabezado; UPDATE/SET detalles; desactivar eliminados; UPDATE productos; contador si hay detalles nuevos; canales cuando corresponde
Cumplir compra/venta	Encabezado; detalles recibidos por ID; sus productos; ambos contadores de stock; canales si la venta tiene huella	UPDATE detalles cumplidos, productos y encabezado; UPDATE contadores; SET movimiento y detalles; estadísticas cuando corresponde
Anular compra	Encabezado; detalles recibidos por ID; productos	UPDATE pendiente de productos y encabezado
Anular venta sin reingreso	Encabezado; detalles; productos; canales si tiene huella	UPDATE reservado de productos y encabezado
Anular venta con reingreso	Lo anterior; contadores de stock si detecta detalles cumplidos	UPDATE productos y encabezado; contadores y SET movimiento/detalles cuando corresponde; UPDATE estadísticas


Dos precisiones sobre las lecturas:
- Al editar, guardarOperacionNucleo() usa detalleOriginal y detalleNuevo recibidos del formulario. No hace transaction.get() de esos documentos de detalle.
- Al cumplir o anular, sí relee los detalles, pero utiliza la lista de IDs recibida de la interfaz. No consulta dentro de la transacción todos los detalles asociados al encabezado.
Los canales concretos son:
- canalesVentas/CV-A0000: acumulados mensuales generales.
- canalesVentas/{canal}: acumulados del canal.
- En una edición que cambia canal, también puede leer y actualizar el canal anterior.
No lee transaccionalmente clientes, proveedores o sucursales para estos movimientos. La lista de sucursales llega desde el contexto.
Fuera de la transacción quedan los formularios, sus cálculos preliminares, las cotizaciones, los diálogos de confirmación, los snapshots que alimentan React y los mensajes de resultado. Las reglas hacen además sus propias consultas de autorización a accesosUsuarios/{uid} y, en ventas, al canal.
No encontré un trigger de stock en functions/index.js: el circuito analizado escribe desde el cliente mediante estos servicios.
Hay un script independiente, cargarColeccion.js, que puede importar documentos con setDoc/addDoc por separado. No está conectado al formulario y no ejecuta el circuito transaccional descrito.
6. Transferencias y registro físico
La transferencia también participa del circuito actual:
TransferenciaForm.guardar()
→ transferirStock()
→ retirar N de origen
→ agregar N en destino
→ recalcular total
→ registrar movimiento TRANSFERENCIA
No toca reservado ni pendiente. Verifica que origen y destino sean distintos, cantidad positiva y existencia del producto. Si el origen quedaría negativo, la interfaz permite confirmar un nuevo intento.
Crea un encabezado y un detalle, con:
- stock.sucursal: origen.
- stock.origenTipo: "transferencia".
- stock.origenId: destino.
- detalleStock.cantidad: cantidad positiva transferida.
- stockAnterior/stockNuevo: existencia del origen antes/después.
Referencia: [transferirStock (line 441)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/operacionesService.js:441).
7. Qué validan las reglas actuales
La actualización de productos usa:
puedeGestionarOperaciones()
AND (
  validModernProductUpdate()
  OR validStockProductUpdate()
  OR validCommercialProductUpdate()
)
AND preservesProductId()
Los roles habilitados son 02, 03 y 04, con acceso activo.
Las ramas son alternativas. No se seleccionan por el nombre del formulario ni por origenTipo: se evalúan sobre el documento resultante y sus campos modificados.
Helper	Campos que admite modificar	Validación principal
validModernProductUpdate()	Campos del esquema completo de producto	Valida documento completo, monedas, números, arrays, fecha y compatibilidad de costo/precio históricos
validStockProductUpdate()	Solo stock, stockSucursal; exige cambio en alguno	Stock numérico entre ±999.999.999; distribución lista de hasta 100 entradas
validSaleProductUpdate()	reservado, precio, monedaPrecio, ediciones, stock, stockSucursal	Reservado no negativo, precio válido, moneda válida y auditoría comercial cuando corresponde
validPurchaseProductUpdate()	pendiente, costo, monedaCosto, ediciones, stock, stockSucursal	Pendiente no negativo, costo válido, moneda válida y auditoría comercial cuando corresponde
validCommercialProductUpdate()	Unión alternativa de venta y compra	Retorna `validSaleProductUpdate()


validModernProductUpdate() no limita la modificación a un conjunto de diferencias: admite los campos del esquema:
id, descripcion, marca, tipo, costo, precio, stock,
monedaCosto, monedaPrecio, imagen, fecha,
pendiente, reservado, stockSucursal, ediciones
Por eso una modificación comercial desde Productos puede pasar por esa rama. validCommercialProductUpdate() no es un validador separado de toda la ficha comercial; es el agrupador de las ramas de venta y compra.
Detalle relevante: las ramas de venta y compra no invocan validadores de tipo/rango de stock ni de estructura de stockSucursal, aunque admiten modificarlos. Las comprobaciones de esas ramas se concentran en obligación, precio/costo y auditoría comercial.
Las reglas tampoco comprueban que:
- stock sea la suma de stockSucursal.
- reservado coincida con los detalles pendientes de ventas.
- pendiente coincida con los detalles pendientes de compras.
- Cada actualización del producto tenga un movimiento físico equivalente.
Esas relaciones las mantiene el código del servicio.
Otros bloques que participan:
Documento	Bloque y efecto
stock	validStockOperation(): encabezado, campos permitidos y tipo de movimiento. Permite crear/actualizar; no borrar
detalleStock	validStockDetail(): campos permitidos, referencias de texto y números con signo. Solo permite crear
compras / ventas	validOperation(), auditoría de creación/preservación y controles específicos de venta
detalleCompras	validDetail('compra'); conserva referencia al padre y excluye campos propios del costo histórico de venta
detalleVentas	validDetail('venta'), snapshot del costo y preservación de campos históricos
contadores	Solo actualización; valida serie, último número e incremento permitido
canalesVentas	Actualización limitada a acumulados; el general admite cambios en meses


Referencias: [helpers de producto (line 191)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/firestore.rules:191), [autorización de productos (line 615)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/firestore.rules:615), [movimientos y detalles (line 670)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/firestore.rules:670), [contadores (line 737)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/firestore.rules:737).
Archivos y funciones implicados
Las líneas corresponden al código local inspeccionado.
Archivo	Función/componente y líneas aproximadas	Responsabilidad
[Productos.jsx (line 6)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/sections/Productos.jsx:6)	Productos, 6–17	Habilita acceso al movimiento manual
[Compras.jsx (line 7)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/sections/Compras.jsx:7)	Compras, 7–23	Configura colección, detalles y acciones
[Ventas.jsx (line 7)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/sections/Ventas.jsx:7)	Ventas, 7–23	Configura colección, detalles y acciones
[Section.jsx (line 49)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/sections/Section.jsx:49)	nuevo, ajusteStock, editar, 49–71; formularios desde 149	Abre formularios y conecta acciones
[Form.jsx (line 186)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/formularios/Form.jsx:186)	handleSubmit, 186–383	Validaciones, cotizaciones, guardado y reintento confirmado
[InputForm.jsx (line 103)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/inputs/InputForm.jsx:103)	Ramas list/listStock, 103–121	Conecta datos y callbacks de las listas
[ListStockForm.jsx (line 31)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/formularios/ListStockForm.jsx:31)	agregarItem, 31–84; actualizarStock, 90–106	Calcula diferencias manuales en memoria
[ListForm.jsx (line 25)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/formularios/ListForm.jsx:25)	agregarItem, 25–71; edición, 73–105	Construye detalles comerciales
[TransferenciaForm.jsx (line 16)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/formularios/TransferenciaForm.jsx:16)	guardar, 16–51	Solicita transferencia y confirma negativos
[AccionesOperacion.jsx (line 31)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/components/operaciones/AccionesOperacion.jsx:31)	cumplir, 31–66; anular, 68–103	Dispara cumplimiento y anulación
[alerts.js (line 122)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/utils/alerts.js:122)	showFulfillment, 122–163; showReason, 165–181	Cantidades adicionales y motivo
[submits.js (line 4)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/submits/submits.js:4)	submit, 4–46; campoFirestore, 48–82	Separa y convierte los campos
[abmFunctions.js (line 45)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/submits/abmFunctions.js:45)	guardarOperacion, 45–237	Deriva al servicio; crea productos con inventario cero
[operacionesService.js (line 129)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/operacionesService.js:129)	asignarCodigos, 129; validarDetalles, 147	IDs y validaciones
Mismo servicio	aplicarMovimientoSucursal, 214; prepararMovimiento, 228; escribirMovimiento, 247	Distribución y persistencia del movimiento
Mismo servicio	guardarMovimientoManual, 279–439; transferirStock, 441–517	Movimientos físicos manuales
Mismo servicio	guardarOperacionNucleo, 519–1011	Alta/edición de compra o venta
Mismo servicio	leerContadoresMovimiento, 1013–1031	Lectura y asignación de IDs de stock
Mismo servicio	registrarCumplimiento, 1033–1231	Recepción/entrega parcial o total
Mismo servicio	anularOperacion, 1266–1438	Liberación de obligaciones y reingreso opcional
[modeloOperaciones.js (line 1)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/modeloOperaciones.js:1)	Estados, restantes y distribución, 1–131	Reglas de cálculo compartidas
[estadisticasVentas.js (line 43)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/estadisticasVentas.js:43)	calcularHuellaVenta, 43; leerAcumuladosVenta, 111; aplicarDiferenciaEstadistica, 157	Estadísticas dentro de las transacciones de venta
[limitesMovimientoStock.js (line 1)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/functions/operaciones/limitesMovimientoStock.js:1)	Constante y helpers, 1–16	Límite visual de 8 productos
[DataLayer.jsx (line 16)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/DataLayer.jsx:16)	collectionsByRoute, desde 16	Selecciona colecciones que escucha cada pantalla
[DataContext.jsx (line 48)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/DataContext.jsx:48)	Suscripciones, 48–110	Lee documentos con onSnapshot
[ProductosContext.jsx (line 10)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/ProductosContext.jsx:10)	productosEnriquecidos, 10–38	Valores numéricos y disponible
[DetalleComprasContext.jsx (line 46)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/DetalleComprasContext.jsx:46) / [DetalleVentasContext.jsx (line 46)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/DetalleVentasContext.jsx:46)	Enriquecimiento, 46–59	Filtra inactivos y compatibilidad histórica
[ComprasContext.jsx (line 15)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/ComprasContext.jsx:15) / [VentasContext.jsx (line 15)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/context/VentasContext.jsx:15)	Enriquecimiento, desde 15	Une encabezados con detalles y estado visible
[camposStock.json (line 1)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/data/campos/camposStock.json:1)	Tipos y detalles, 1–88	Configura formulario manual
[camposProductos.json (line 111)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/data/campos/camposProductos.json:111)	Inventario, 111–146	Campos de stock de solo visualización
[camposCompras.json (line 142)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/data/campos/camposCompras.json:142) / [camposVentas.json (line 154)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/data/campos/camposVentas.json:154)	Estado inicial y detalles	Pendiente o directamente completada
[firestore.rules (line 191)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/firestore.rules:191)	Helpers 191–556; matches 615–805	Autoriza y valida las escrituras
[permisos.js (line 17)](C:/Users/Bautista Vadillo/Desktop/aplicaciones/miradageek/src/auth/permisos.js:17)	puedeGestionarOperaciones, 17	Visibilidad de acciones según rol


La lógica genérica antigua de modificación de stock sigue presente en abmFunctions.js, aproximadamente líneas 176–232, pero las llamadas actuales con colección stock, compras o ventas retornan antes hacia el servicio específico. No la tomé como comportamiento activo de esos formularios.
Posibles inconsistencias / deuda técnica
Estos puntos surgen de diferencias concretas en el código; no implican que haya comprobado datos dañados en producción.
1. El ajuste calcula una diferencia contra una lectura anterior, aunque muestra un stock final.
   Si el formulario muestra 10, se pide ajustar a 15 y otro movimiento lleva el stock a 12 antes de guardar, el servicio aplica +5 y termina en 17. La transacción relee el producto, pero no recalcula la diferencia para alcanzar 15.
   Referencias: ListStockForm, 53–68 y 90–102; servicio, 359–382.
2. La interfaz y el servicio usan distinta base cuando falta una sucursal en una distribución válida.
   La interfaz toma como respaldo el stock total; el servicio considera cero para esa sucursal. Esto puede producir una vista previa incorrecta y, en ajustes, una diferencia incorrecta.
   Referencias: ListStockForm, 49–60; servicio, 371–384.
3. El control de stock negativo cambia según el circuito.
   El movimiento manual verifica total y sucursal; las entregas y las altas completadas verifican solamente el total. Por ejemplo, entregar 3 desde una sucursal con 1 puede dejarla en -2 sin advertencia si otra sucursal mantiene positivo el total.
   Referencias: servicio, 385–387, 947 y 1144.
4. La edición no relee los detalles que utiliza para calcular obligaciones.
   Un formulario abierto antes de un cumplimiento puede conservar cantidades cumplidas viejas. Al guardar usa esos valores para actualizar el detalle y calcular reservado/pendiente, aunque relea encabezado y producto. La transacción no elimina esa diferencia porque esos detalles no forman parte de sus lecturas.
   Referencias: servicio, 588–617, 630–641 y 829–888.
5. La sucursal sigue siendo editable después de cumplir mercadería.
   La edición del encabezado no redistribuye lo ya movido. Los cumplimientos posteriores y un eventual reingreso de venta usan la sucursal nueva, incluso para devolver cantidades entregadas desde la anterior.
   Referencias: campos de sucursal; servicio, 190–212, 798 y 1359–1363.
6. stockAnterior y stockNuevo no tienen un significado uniforme en detalleStock.
   En manuales y transferencias representan la sucursal; en compras, ventas y reingresos representan el total del producto. Además, en transferencias cantidad es positiva aunque el par anterior/nuevo registre la baja del origen.
   Referencias: servicio, 414–415, 508–510, 959–960, 1160–1161 y 1375–1376.
7. El reingreso histórico puede quedar sin movimiento registrado.
   Para calcular la devolución de una venta sin estado, el servicio interpreta cantidadCumplida = cantidad. Pero decide previamente si lee contadores mirando el cantidadCumplida crudo del detalle. Si ese campo falta, puede aumentar el stock sin crear stock/detalleStock.
   Referencias: servicio, 1318–1323, 1344–1357 y 1408.
8. El selector “Estado inicial” aparece también al editar, pero su selección no gobierna el resultado.
   Los JSON incluyen altaOnly: true; Form no filtra por esa propiedad. Al editar, el servicio calcula el estado desde los detalles e ignora el estado solicitado como instrucción de cumplimiento.
   Referencias: Form, 120 y 408; servicio, 537–538 y 692.
9. Las reglas no aplican uniformemente las restricciones de inventario.
   Las ramas comerciales admiten cambios de stock/stockSucursal sin sus validadores específicos; además, la rama moderna puede autorizar por sí sola la modificación. La correspondencia entre productos, obligaciones y movimientos queda en el servicio, sin una comprobación equivalente en reglas.
   Referencias: firestore.rules, 288–335 y 621–625.