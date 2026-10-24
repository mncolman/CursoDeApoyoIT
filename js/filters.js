// --- archivo: filters.js ---
export function filtrarYOrdenar(listaOriginal, search, comision, sortMethod, turno) {
    // 1. Filtrado
    let filteredData = listaOriginal.filter(asp => {
        const nombreLimpio = quitarAcentos(asp.nombre.toLowerCase());
        const apellidoLimpio = quitarAcentos(asp.apellido.toLowerCase());

        const matchSearch = asp.dni.includes(search) ||
            nombreLimpio.includes(search) ||
            apellidoLimpio.includes(search);

        const matchComision = (comision === "") || (String(asp.comision) === comision);
        const matchTurno = (!turno || turno === "") || (String(asp.turno_cursillo) === turno);

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

    return filteredData;
}

// Función para eliminar acentos y diacríticos
function quitarAcentos(texto) {
    return String(texto || '').normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Devuelve la etapa seleccionada en el filtro global ('oficial' | 'ensayo' | 'seguimiento')
 */
export function obtenerEtapaSeleccionada() {
    return document.getElementById('filtro-etapa-evaluacion')?.value || 'oficial';
}

/**
 * Proyecta el padrón de alumnos según la etapa seleccionada para que todas las vistas
 * (KPIs, Orden de Mérito, Comisiones, Docentes, Alumnos, Histograma) lean `datos_examen`
 * de forma transparente sin duplicar lógica.
 * Guarda siempre `datos_examen_oficial` intacto para la pestaña Examen vs Cursillo.
 */
export function proyectarAlumnosPorEtapa(alumnosBase, datosCursillo = [], etapa = null) {
    if (!alumnosBase || alumnosBase.length === 0) return [];
    const etapaActiva = etapa || obtenerEtapaSeleccionada();

    // Si es examen oficial, aseguramos conservar datos_examen_oficial y calculamos promedioGeneral
    if (etapaActiva === 'oficial') {
        return alumnosBase.map(alumno => {
            const ex = alumno.datos_examen_oficial || alumno.datos_examen || {};
            const notas = [];
            if (ex.estado_matematica === "Presente" && !isNaN(parseFloat(ex.nota_final_matematica))) {
                notas.push(parseFloat(ex.nota_final_matematica));
            }
            if (ex.estado_lengua === "Presente" && !isNaN(parseFloat(ex.nota_final_lengua))) {
                notas.push(parseFloat(ex.nota_final_lengua));
            }
            if (ex.estado_dibujo === "Presente" && !isNaN(parseFloat(ex.nota_final_dibujo))) {
                notas.push(parseFloat(ex.nota_final_dibujo));
            }
            const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
            return {
                ...alumno,
                datos_examen_oficial: ex,
                datos_examen: ex,
                promedioGeneral: promedio
            };
        });
    }

    // Indexamos cursillo por número de inscripción para cruce O(1)
    const mapaCursillo = new Map();
    if (Array.isArray(datosCursillo)) {
        datosCursillo.forEach(item => {
            const id = Number(item.nro_inscripcion);
            if (id > 0) mapaCursillo.set(id, item.cursillo);
        });
    }

    const claveEtapaCursillo = etapaActiva === 'seguimiento' ? 'evaluacion_seguimiento' : 'ensayo_examen';

    return alumnosBase.map(alumno => {
        const exOficial = alumno.datos_examen_oficial || alumno.datos_examen || {};
        const nroInsc = Number(
            alumno['Nº de inscripción'] ||
            alumno['N° de inscripción'] ||
            alumno['N° de orden'] ||
            alumno['Nº de orden'] ||
            alumno.nro_inscripcion ||
            0
        );

        const cursilloAlumno = mapaCursillo.get(nroInsc) || {};
        const notasEtapa = cursilloAlumno[claveEtapaCursillo] || {};

        const matVal = parseFloat(notasEtapa.matematica);
        const lenVal = parseFloat(notasEtapa.lengua);
        const dibVal = parseFloat(notasEtapa.dibujo);

        const matPres = !isNaN(matVal) && matVal > 0;
        const lenPres = !isNaN(lenVal) && lenVal > 0;
        const dibPres = !isNaN(dibVal) && dibVal > 0;

        const notasValidas = [];
        if (matPres) notasValidas.push(matVal);
        if (lenPres) notasValidas.push(lenVal);
        if (dibPres) notasValidas.push(dibVal);

        const promedio = notasValidas.length > 0
            ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length
            : 0;

        const datosExamenSintetico = {
            estado_matematica: matPres ? "Presente" : "Ausente",
            nota_final_matematica: matPres ? matVal : 0,
            incisos_matematica: {},
            estado_lengua: lenPres ? "Presente" : "Ausente",
            nota_final_lengua: lenPres ? lenVal : 0,
            incisos_lengua: {},
            estado_dibujo: dibPres ? "Presente" : "Ausente",
            nota_final_dibujo: dibPres ? dibVal : 0,
            incisos_dibujo: {}
        };

        return {
            ...alumno,
            datos_examen_oficial: exOficial,
            datos_examen: datosExamenSintetico,
            promedioGeneral: promedio
        };
    });
}

export function obtenerAlumnosFiltradosPorMerito(alumnosBase, datosCursillo = null) {
    if (!alumnosBase || alumnosBase.length === 0) return [];

    // 1. Proyectamos según la etapa activa (oficial, ensayo o seguimiento)
    const cursilloRef = datosCursillo || (window.EstadoDashboard?.cursillo) || [];
    const alumnosConPromedio = proyectarAlumnosPorEtapa(alumnosBase, cursilloRef);

    // Orden descendente por nota de la etapa seleccionada
    alumnosConPromedio.sort((a, b) => b.promedioGeneral - a.promedioGeneral);

    // 2. Asignamos posición de mérito según la etapa seleccionada
    const alumnosConMerito = alumnosConPromedio.map((alumno, index) => ({
        ...alumno,
        ordenMerito: index + 1
    }));

    // 3. Leemos los filtros activos de la pantalla y normalizamos la búsqueda (sin DNI)
    const textoBusquedaCrudo = (document.getElementById('buscador-escuela-alumno')?.value || '').toLowerCase().trim();
    const textoBusqueda = quitarAcentos(textoBusquedaCrudo);

    const minInput = parseInt(document.getElementById('filtro-merito-min')?.value) || 1;
    const maxInput = parseInt(document.getElementById('filtro-merito-max')?.value) || alumnosConMerito.length;

    // 4. Aplicamos ambos filtros en simultáneo (Nombre, Apellido, Escuela, Departamento u Orden)
    return alumnosConMerito.filter(alumno => {
        const dentroDeRango = alumno.ordenMerito >= minInput && alumno.ordenMerito <= maxInput;
        if (!dentroDeRango) return false;
        if (!textoBusqueda) return true;

        const apellido = quitarAcentos((alumno['Apellido/s del alumno'] || '').toLowerCase());
        const nombre = quitarAcentos((alumno['Nombre/s del alumno'] || '').toLowerCase());
        const nombreCompleto = `${apellido}, ${nombre}`;
        const escuela = quitarAcentos((alumno['Establecimiento escolar de donde proviene'] || '').toLowerCase());
        const depto = quitarAcentos((alumno['Departamento'] || '').toLowerCase());
        const orden = String(alumno['N° de orden'] || alumno['Nº de orden'] || '').toLowerCase();

        return (
            nombreCompleto.includes(textoBusqueda) ||
            apellido.includes(textoBusqueda) ||
            nombre.includes(textoBusqueda) ||
            escuela.includes(textoBusqueda) ||
            depto.includes(textoBusqueda) ||
            orden.includes(textoBusqueda)
        );
    });
}
