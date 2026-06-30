export const formatearCampoFirestore = (valor) => {
    // de firestore al front
    if (valor === null || valor === undefined) return "-";

    if (typeof valor === "boolean") return valor ? "Activo" : "Inactivo";

    // fechas
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/; // formato 2025-08-22T08:00:00Z
    const isoRegex2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{3}Z$/; // formato 2025-08-22T08:00:000Z (error)

    if (typeof valor === "string" && isoRegex.test(valor)) {
        return new Date(valor).toLocaleDateString("es-AR");
    }
    if (typeof valor === "string" && isoRegex2.test(valor)) {
        // corregir y eliminar el 0 de más en 000Z (debe ser 00Z)
        const corregido = valor.replace(
            /T(\d{2}:\d{2}):(\d{3})Z$/,
            "T$1:00.$2Z"
        );

        return new Date(corregido).toLocaleDateString("es-AR");
    }
    if (typeof valor.toDate === "function") {
        return valor.toDate().toLocaleString();
    }
    if (valor?.seconds) {
        return new Date(valor.seconds * 1000).toLocaleString();
    }

    // array y objetos
    if (Array.isArray(valor)) {
        return valor
            .map(v => (typeof v === "object" ? "[obj]" : v))
            .join(", ");
    }
    if (typeof valor === "object") {
        if (valor.nombre) return valor.nombre;
        if (valor.id) return valor.id;
        // fechas
        if (typeof valor._seconds === "number") {
            const fecha = new Date(valor._seconds * 1000);
            return fecha.toLocaleDateString("es-AR");
        }

        if (typeof valor.seconds === "number") {
            const fecha = new Date(valor.seconds * 1000);
            return fecha.toLocaleDateString("es-AR");
        }

        if (typeof valor.toDate === "function") {
            return valor.toDate().toLocaleDateString("es-AR");
        }



        //return JSON.stringify(valor);


        return "[Objeto]";
    }

    return valor.toString();
};

export function isTimestamp(value) {
    return value && typeof value.toDate === "function";
}

export function timestampToInput(value) {
    return value.toDate().toISOString().slice(0, 16);
}