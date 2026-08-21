# Revisión de reglas — Canales de Venta

Fecha: 2026-08-21

Este documento registra el análisis de seguridad realizado para la incorporación
de `canalesVentas`. No reemplaza pruebas con Firebase Emulator ni una revisión
de backend.

## Modelo y accesos revisados

- La aplicación usa React y Firebase Web SDK modular.
- La base `(default)` es Firestore Native, edición Standard.
- Roles `02`, `03` y `04` ejecutan operaciones comerciales desde el cliente.
- Rol `02` consulta canales activos excluyendo `CV-A0000`.
- Roles `03` y `04` leen todos los canales desde `/estadisticas`.
- Las ventas, detalles, productos, stock, canales y resumen mensual se escriben
  dentro de la misma transacción cliente.
- `CV-A0000` sólo admite cambios en `meses`; los demás canales sólo en
  `ventas`, `totalCostos`, `totalPrecios` y `ultimaVenta`.

## Pruebas adversariales conceptuales

| Vector | Resultado |
| --- | --- |
| Lectura pública | Bloqueada: todos los accesos requieren usuario activo. |
| Rol `01` leyendo canales/estadísticas | Bloqueado. |
| Rol `02` leyendo `CV-A0000` | Bloqueado por documento y por la query usada. |
| Rol `02` entrando a `/estadisticas` | Bloqueado en permisos, ruta y reglas. |
| Creación/eliminación de canales | Bloqueada. |
| Cambio de nombre, ID o estado durante un acumulado | Bloqueado por campos inmutables. |
| Campos arbitrarios o tipos inválidos | Bloqueados por validadores de esquema. |
| Valores agregados negativos o fuera de rango | Bloqueados en agregados de canal. |
| Quitar la huella a una venta nueva | Bloqueado. |
| Usar `CV-A0000` como canal de una venta | Bloqueado. |
| Contabilizar una venta nueva sin snapshot de costo | Bloqueado por detalle y aplicación. |
| Alterar acumulados con una transacción cliente fabricada | No puede bloquearse completamente con esta arquitectura. |

## Limitación aceptada

Las reglas no pueden recorrer y validar cada entrada de mapas mensuales ni
demostrar que los acumulados enviados por un cliente corresponden exactamente
a todas las líneas y cumplimientos de una venta. Un usuario con rol operativo
`02`, `03` o `04` y un cliente modificado conserva capacidad técnica para
falsear acumulados.

La mitigación implementada aplica mínimo privilegio dentro del diseño aprobado:

- esquema estricto;
- roles obtenidos de `accesosUsuarios`, no de datos enviados por el cliente;
- campos de catálogo inmutables durante actualizaciones estadísticas;
- documentos reservados no seleccionables;
- transacciones atómicas;
- límites de tamaño y rangos numéricos;
- denegación por defecto.

Eliminar completamente esta limitación requiere ejecutar la operación comercial
en un entorno confiable, por ejemplo una Cloud Function autenticada. Esa opción
queda expresamente fuera del alcance de esta etapa.
