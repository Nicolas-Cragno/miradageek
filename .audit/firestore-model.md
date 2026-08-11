# Firestore model audit

The application authenticates with Firebase email/password and authorizes two
existing internal UIDs. It reads `usuarios` by the authenticated UID. Reference
collections are `roles`, `sucursales`, and `tipos`.

Editable master collections are `clientes`, `proveedores`, and `productos`.
Operational aggregates are `compras` + `detalleCompras`, `ventas` +
`detalleVentas`, and `stock` + `detalleStock`. Each operation atomically updates
its corresponding `contadores` documents and affected `productos` documents.

Queries currently used: `usuarios where uid == current uid limit 1`. Operational
detail queries were removed from the save path; route data uses collection
listeners without filters. No composite index is currently required.

Security assumptions: only the two explicitly allowed internal UIDs may access
business data; user profiles cannot be changed from the client; reference data
is read-only; detail documents are immutable and replaced transactionally.
