import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
    credential: applicationDefault(),
    projectId: "geek-look",
});

const db = getFirestore();

const DRY_RUN = true;
const CONFIRMAR_ESCRITURA = false;

function convertirNumero(valor) {
    if (valor === null || valor === undefined) {
        return {
            valido: true,
            cambiar: false,
            valor,
            tipoCambio: null,
        };
    }

    if (typeof valor === "number") {
        if (!Number.isFinite(valor)) {
            return {
                valido: false,
                cambiar: false,
                valor,
                tipoCambio: null,
            };
        }

        return {
            valido: true,
            cambiar: false,
            valor,
            tipoCambio: null,
        };
    }

    if (typeof valor !== "string") {
        return {
            valido: false,
            cambiar: false,
            valor,
            tipoCambio: null,
        };
    }

    const limpio = valor.trim();

    // String vacío histórico → null
    if (limpio === "") {
        return {
            valido: true,
            cambiar: true,
            valor: null,
            tipoCambio: "null",
        };
    }

    /*
      Formatos numéricos simples permitidos:
      56000
      56000.5
      0
      -10
  
      Luego bloqueamos negativos para costo/precio.
    */
    if (!/^-?\d+(\.\d+)?$/.test(limpio)) {
        return {
            valido: false,
            cambiar: false,
            valor,
            tipoCambio: null,
        };
    }

    const numero = Number(limpio);

    if (!Number.isFinite(numero)) {
        return {
            valido: false,
            cambiar: false,
            valor,
            tipoCambio: null,
        };
    }

    return {
        valido: true,
        cambiar: true,
        valor: numero,
        tipoCambio: "number",
    };
}

function procesarCampo({
    producto,
    campo,
    resultado,
    reporte,
    update,
    id,
}) {
    const valorOriginal = producto[campo];

    if (valorOriginal === null || valorOriginal === undefined) {
        reporte[`${campo}Ausente`]++;
        return;
    }

    if (!resultado.valido) {
        reporte[`${campo}Invalido`]++;

        reporte.errores.push({
            id,
            campo,
            valor: valorOriginal,
            motivo: "Valor no convertible a number/null",
        });

        return;
    }

    if (!resultado.cambiar) {
        reporte[`${campo}YaNumber`]++;
        return;
    }

    // null es válido para históricos vacíos.
    if (resultado.valor === null) {
        update[campo] = null;
        reporte[`${campo}NormalizadoNull`]++;
        return;
    }

    if (resultado.valor < 0) {
        reporte[`${campo}Invalido`]++;

        reporte.errores.push({
            id,
            campo,
            valor: valorOriginal,
            motivo: "Número negativo",
        });

        return;
    }

    update[campo] = resultado.valor;
    reporte[`${campo}Convertido`]++;
}

async function main() {
    console.log("");
    console.log("==============================================");
    console.log(" NORMALIZACIÓN costo/precio DE PRODUCTOS");
    console.log("==============================================");
    console.log(
        `Modo: ${DRY_RUN
            ? "DRY RUN"
            : CONFIRMAR_ESCRITURA
                ? "ESCRITURA REAL"
                : "BLOQUEADO"
        }`,
    );
    console.log("");

    const snapshot = await db.collection("productos").get();

    const reporte = {
        productosLeidos: snapshot.size,
        productosSinCambios: 0,
        productosAModificar: 0,

        costoConvertido: 0,
        precioConvertido: 0,

        costoNormalizadoNull: 0,
        precioNormalizadoNull: 0,

        costoYaNumber: 0,
        precioYaNumber: 0,

        costoAusente: 0,
        precioAusente: 0,

        costoInvalido: 0,
        precioInvalido: 0,

        errores: [],
    };

    const cambios = [];

    for (const docSnap of snapshot.docs) {
        const producto = docSnap.data();

        const costo = convertirNumero(producto.costo);
        const precio = convertirNumero(producto.precio);

        const update = {};

        procesarCampo({
            producto,
            campo: "costo",
            resultado: costo,
            reporte,
            update,
            id: docSnap.id,
        });

        procesarCampo({
            producto,
            campo: "precio",
            resultado: precio,
            reporte,
            update,
            id: docSnap.id,
        });

        if (Object.keys(update).length === 0) {
            reporte.productosSinCambios++;
            continue;
        }

        reporte.productosAModificar++;

        cambios.push({
            ref: docSnap.ref,
            id: docSnap.id,
            update,
            anterior: {
                costo: producto.costo,
                precio: producto.precio,
            },
        });
    }

    console.log("========== RESUMEN ==========");

    console.table({
        productosLeidos: reporte.productosLeidos,
        productosSinCambios: reporte.productosSinCambios,
        productosAModificar: reporte.productosAModificar,

        costoConvertido: reporte.costoConvertido,
        precioConvertido: reporte.precioConvertido,

        costoNormalizadoNull: reporte.costoNormalizadoNull,
        precioNormalizadoNull: reporte.precioNormalizadoNull,

        costoYaNumber: reporte.costoYaNumber,
        precioYaNumber: reporte.precioYaNumber,

        costoAusente: reporte.costoAusente,
        precioAusente: reporte.precioAusente,

        costoInvalido: reporte.costoInvalido,
        precioInvalido: reporte.precioInvalido,
    });

    console.log("");
    console.log("========== CAMBIOS ==========");

    for (const cambio of cambios) {
        console.log(cambio.id, {
            anterior: cambio.anterior,
            nuevo: cambio.update,
        });
    }

    if (reporte.errores.length) {
        console.log("");
        console.log("========== VALORES INVÁLIDOS ==========");
        console.table(reporte.errores);
    }

    if (DRY_RUN) {
        console.log("");
        console.log("DRY_RUN activo.");
        console.log("NO se escribió ningún documento.");
        return;
    }

    if (!CONFIRMAR_ESCRITURA) {
        console.log("");
        console.log("Escritura bloqueada.");
        console.log(
            "Para escribir, DRY_RUN debe ser false y CONFIRMAR_ESCRITURA debe ser true.",
        );
        return;
    }

    if (reporte.errores.length > 0) {
        throw new Error(
            "Hay valores inválidos. Se bloqueó la escritura para evitar una migración parcial incorrecta.",
        );
    }

    console.log("");
    console.log(`Escribiendo ${cambios.length} productos...`);

    /*
      Firestore admite hasta 500 operaciones por batch.
      Usamos 400 para dejar margen.
    */
    const TAMANO_BATCH = 400;

    for (let i = 0; i < cambios.length; i += TAMANO_BATCH) {
        const grupo = cambios.slice(i, i + TAMANO_BATCH);

        const batch = db.batch();

        for (const cambio of grupo) {
            batch.update(cambio.ref, cambio.update);
        }

        await batch.commit();

        console.log(
            `✔ Batch ${Math.floor(i / TAMANO_BATCH) + 1}: ${grupo.length} productos`,
        );
    }

    console.log("");
    console.log("==============================================");
    console.log(" NORMALIZACIÓN COMPLETADA");
    console.log("==============================================");
}

main()
    .then(() => {
        console.log("");
        console.log("Proceso finalizado.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("");
        console.error("ERROR GENERAL:", error);
        process.exit(1);
    });