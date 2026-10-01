
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



export function obtenerAlumnosFiltradosPorMerito(alumnosBase) {
    if (!alumnosBase || alumnosBase.length === 0) return [];

    // 1. Calculamos promedios y ordenamos de mayor a menor
    const alumnosConPromedio = alumnosBase.map(alumno => {
        const ex = alumno.datos_examen || {};
        const notas = [];
        if (ex.estado_matematica === "Presente") notas.push(ex.nota_final_matematica);
        if (ex.estado_lengua === "Presente") notas.push(ex.nota_final_lengua);
        if (ex.estado_dibujo === "Presente") notas.push(ex.nota_final_dibujo);

        const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
        return { ...alumno, promedioGeneral: promedio };
    });

    // Orden descendente por nota
    alumnosConPromedio.sort((a, b) => b.promedioGeneral - a.promedioGeneral);

    // 2. Asignamos posición de mérito oficial
    const alumnosConMerito = alumnosConPromedio.map((alumno, index) => ({
        ...alumno,
        ordenMerito: index + 1
    }));

    // 3. Leemos los filtros activos de la pantalla
    const textoBusqueda = (document.getElementById('filtro-buscar-alumno')?.value || '').toLowerCase().trim();
    const minInput = parseInt(document.getElementById('filtro-merito-min')?.value) || 1;
    const maxInput = parseInt(document.getElementById('filtro-merito-max')?.value) || alumnosConMerito.length;

    // 4. Aplicamos ambos filtros en simultáneo
    return alumnosConMerito.filter(alumno => {
        const dentroDeRango = alumno.ordenMerito >= minInput && alumno.ordenMerito <= maxInput;

        if (!dentroDeRango) return false;
        if (!textoBusqueda) return true;

        const nombre = (alumno['Apellido y Nombre'] || alumno['Nombre y Apellido'] || '').toLowerCase();
        const orden = String(alumno['N° de orden'] || alumno['Nº de orden'] || '').toLowerCase();

        return nombre.includes(textoBusqueda) || orden.includes(textoBusqueda);
    });
}