import { useMemo } from "react";
import { useData } from "../context/DataContext";
import Section from "./Section";
import UsuarioForm from "../components/formularios/UsuarioForm";
import campos from "../data/campos/camposUsuarios.json";
import { FEATURES } from "../config/features";

const nombresRoles = {
  "01": "USUARIO",
  "02": "GESTOR",
  "03": "ADMINISTRADOR",
  "04": "DESARROLLADOR",
};

export default function Usuarios() {
  const { usuarios = [], accesosUsuarios = [] } = useData();
  const usuariosAdministrables = useMemo(
    () =>
      usuarios.map((usuario) => {
        const acceso = accesosUsuarios.find(
          (item) => item.id === usuario.uid && item.usuarioId === usuario.id,
        );
        return {
          ...usuario,
          tipo: acceso?.tipo ?? usuario.tipo,
          estado: acceso?.estado ?? false,
          entidadTipo: acceso?.entidadTipo ?? usuario.entidadTipo ?? "",
          entidadId: acceso?.entidadId ?? usuario.entidadId ?? "",
          labelRol: nombresRoles[acceso?.tipo ?? usuario.tipo] ?? "Sin rol",
        };
      }),
    [accesosUsuarios, usuarios],
  );

  return (
    <Section
      data={usuariosAdministrables}
      campos={campos}
      title="Usuarios"
      collection="usuarios"
      FormComponent={UsuarioForm}
      permitirAlta={FEATURES.CREAR_USUARIOS}
      mensajeAltaDeshabilitada="Alta de usuarios temporalmente deshabilitada"
    />
  );
}
