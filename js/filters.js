
// --- archivo: filters.js ---
export function filtrarYOrdenar(listaOriginal, search, comision, sortMethod, turno) {
    // 1. Filtrado
    let filteredData = listaOriginal.filter(asp => {
        // (Asegurate de tener quitarAcentos disponible en este archivo)
        const nombreLimpio = quitarAcentos(asp.nombre.toLowerCase());
        const apellidoLimpio = quitarAcentos(asp.apellido.toLowerCase());

        const matchSearch = asp.dni.includes(search) ||
            nombreLimpio.includes(search) ||
            apellidoLimpio.includes(search);

        const matchComision = (comision === "") || (String(asp.comision) === comision);

        // --- NUEVO: Validamos el turno ---
        // ATENCIÓN: Asumo que en tu JSON/BD la propiedad se llama "turno". 
        // Si se llama distinto (ej: asp.horario), cambialo acá.
        const matchTurno = (!turno || turno === "") || (String(asp.turno_cursillo) === turno);

        // Devolvemos true solo si cumple TODAS las condiciones
        return matchSearch && matchComision && matchTurno;
    });

    // 2. Ordenamiento
    filteredData.sort((a, b) => {
        switch (sortMethod) {
            case 'nombre_asc': return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
            case 'nombre_desc': return (b.apellido + b.nombre).localeCompare(a.apellido + a.nombre);
            case 'inscripcion_asc': return a.id_inscripcion - b.id_inscripcion;
            case 'inscripcion_desc': return b.id_inscripcion - a.id_inscripcion;
            case 'depto_asc':
                const deptoA = a.departamento || "";
                const deptoB = b.departamento || "";
                return deptoA.localeCompare(deptoB);
            default: return 0;
        }
    });

    return filteredData; // <-- Solo devuelve la lista procesada
}


// Función para eliminar acentos y diacríticos
function quitarAcentos(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
