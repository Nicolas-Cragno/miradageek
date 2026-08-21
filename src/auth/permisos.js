export const ROLES = {
  USUARIO: "01",
  GESTOR: "02",
  ADMINISTRADOR: "03",
  DESARROLLADOR: "04",
};

export const ENTIDADES_USUARIO = {
  CLIENTE: "cliente",
  PROVEEDOR: "proveedor",
};

export const TIPOS_ENTIDAD_USUARIO = Object.values(ENTIDADES_USUARIO);

export const esUsuarioExterno = (usuario) => usuario?.tipo === ROLES.USUARIO;

export const puedeGestionarOperaciones = (usuario) =>
  [ROLES.GESTOR, ROLES.ADMINISTRADOR, ROLES.DESARROLLADOR].includes(
    usuario?.tipo,
  );

export const puedeAdministrarUsuarios = (usuario) =>
  [ROLES.ADMINISTRADOR, ROLES.DESARROLLADOR].includes(usuario?.tipo);

export const puedeVerInformes = (usuario) =>
  [ROLES.ADMINISTRADOR, ROLES.DESARROLLADOR].includes(usuario?.tipo);

export const esDesarrollador = (usuario) =>
  usuario?.tipo === ROLES.DESARROLLADOR;

export const rutaInicialPara = (usuario) =>
  esUsuarioExterno(usuario) ? "/productos" : "/";

export const puedeAccederRuta = (usuario, ruta) => {
  if (!usuario) return false;
  if (ruta === "/productos") return true;
  if (ruta === "/usuarios") return puedeAdministrarUsuarios(usuario);
  if (ruta === "/estadisticas") return puedeVerInformes(usuario);
  if (ruta === "/") return puedeVerInformes(usuario) || puedeGestionarOperaciones(usuario);
  if (["/clientes", "/proveedores"].includes(ruta)) {
    return puedeGestionarOperaciones(usuario);
  }
  if (ruta === "/compras") {
    return (
      puedeGestionarOperaciones(usuario) ||
      (esUsuarioExterno(usuario) && usuario.entidadTipo === "proveedor")
    );
  }
  if (ruta === "/ventas") {
    return (
      puedeGestionarOperaciones(usuario) ||
      (esUsuarioExterno(usuario) && usuario.entidadTipo === "cliente")
    );
  }
  return false;
};
