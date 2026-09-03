import { ESTADOS_OPERACION } from "../functions/operaciones/modeloOperaciones";

export const filtrosProductos = [
  {
    id: "stock",
    label: "Stock",
    options: [
      { value: "todos", label: "Todos" },
      {
        value: "conStock",
        label: "Con stock",
        filter: (item) => {
          const stock = Number(item.stock);
          return Number.isFinite(stock) && stock > 0;
        },
      },
      {
        value: "sinStock",
        label: "Sin stock",
        filter: (item) => {
          const stock = Number(item.stock);
          return Number.isFinite(stock) && stock === 0;
        },
      },
    ],
  },
];

export const filtrosOperaciones = [
  {
    id: "estado",
    label: "Estado",
    options: [
      { value: "todos", label: "Todos" },
      ...Object.values(ESTADOS_OPERACION).map((estado) => ({
        value: estado,
        label: estado.charAt(0) + estado.slice(1).toLowerCase(),
        filter: (item) => item.estado === estado,
      })),
    ],
  },
];

export const filtrosUsuarios = [
  {
    id: "estado",
    label: "Estado",
    options: [
      { value: "todos", label: "Todos" },
      {
        value: "activos",
        label: "Activos",
        filter: (item) => item.estado === true,
      },
      {
        value: "inactivos",
        label: "Inactivos",
        filter: (item) => item.estado === false,
      },
    ],
  },
];
