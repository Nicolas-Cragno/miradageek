export const formatearCampoFirestore = (valor) => {
    if (valor === null || valor === undefined) return "-";
    if (typeof valor === "boolean") {
        return valor ? "Activo" : "Inactivo";
    }

    if (typeof valor === "string") {
        const isoRegex =
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

        if (isoRegex.test(valor)) {
            return new Date(valor).toLocaleString("es-AR");
        }

        return valor;
    }

    const isFirestoreTimestamp = (v) =>
        v &&
        typeof v === "object" &&
        typeof v.seconds === "number";

    if (isFirestoreTimestamp(valor)) {
        return new Date(valor.seconds * 1000).toLocaleString("es-AR");
    }

    if (valor?.toDate && typeof valor.toDate === "function") {
        return valor.toDate().toLocaleString("es-AR");
    }


    if (Array.isArray(valor)) {
        return valor
            .map((item, index) => `→ ${formatearCampoFirestore(item)}`)
            .join("\n");
    }

    if (typeof valor === "object") {

        if (valor.type === "firestore/timestamp/1.0" && valor.seconds) {
            return new Date(valor.seconds * 1000).toLocaleString("es-AR");
        }


        if (valor.nombre) return valor.nombre;
        if (valor.label) return valor.label;
        if (valor.id) return valor.id;

        // fallback inteligente: evitar [Objeto]
        const entries = Object.entries(valor);

        if (entries.length <= 3) {
            return entries
                .map(([k, v]) => `${k}: ${formatearCampoFirestore(v)}`)
                .join(" | ");
        }

        return "Objeto complejo";
    }

    // -----------------------------
    // NUMEROS
    // -----------------------------
    if (typeof valor === "number") {
        return valor.toLocaleString("es-AR");
    }

    // -----------------------------
    // FALLBACK FINAL
    // -----------------------------
    return String(valor);
};

export function formatearArrayFirestore(array) {
    if (!Array.isArray(array) || array.length === 0) return "-";

    return array.map(item => {
        if (typeof item !== "object") return item;

        // Si existe un label ya preparado
        if (item.label) return item.label;

        // Tomar todos los campos simples
        return Object.entries(item)
            .filter(([key, value]) =>
                !["id"].includes(key) &&
                value !== null &&
                value !== "" &&
                typeof value !== "object"
            )
            .map(([key, value]) => `${key}: ${value}`)
            .join(" | ");
    });
}
export function isTimestamp(value) {
    return value && typeof value.toDate === "function";
}

export function timestampToInput(value) {
    return value.toDate().toISOString().slice(0, 16);
}