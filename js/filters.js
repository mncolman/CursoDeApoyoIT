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

/** Normaliza texto alfabético (sin acentos, minúsculas, espacios colapsados) para comparar rangos. */
function normalizarClaveAlfabetica(texto) {
    return quitarAcentos(String(texto ?? ''))
        .toLowerCase()
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Recorta una lista ya filtrada y ordenada según un rango por posición (1-based)
 * o alfabético por apellido y nombre, preservando la posición original previa al corte.
 */
export function aplicarRangoListado(listaOrdenada, rangoConfig = {}) {
    const lista = Array.isArray(listaOrdenada) ? listaOrdenada : [];
    const totalPreRango = lista.length;

    if (totalPreRango === 0) {
        return { items: [], posiciones: [], totalPreRango: 0, activo: false };
    }

    const modo = rangoConfig?.modo === 'alfabetico' ? 'alfabetico' : 'posicion';
    const desdeRaw = String(rangoConfig?.desde ?? '').trim();
    const hastaRaw = String(rangoConfig?.hasta ?? '').trim();

    if (desdeRaw === '' && hastaRaw === '') {
        return {
            items: lista,
            posiciones: lista.map((_, idx) => idx + 1),
            totalPreRango,
            activo: false
        };
    }

    if (modo === 'posicion') {
        let desdeNum = desdeRaw !== '' ? parseInt(desdeRaw, 10) : 1;
        let hastaNum = hastaRaw !== '' ? parseInt(hastaRaw, 10) : totalPreRango;

        if (isNaN(desdeNum) || desdeNum < 1) desdeNum = 1;
        if (isNaN(hastaNum) || hastaNum < 1) hastaNum = totalPreRango;

        if (desdeNum > hastaNum || desdeNum > totalPreRango) {
            return { items: [], posiciones: [], totalPreRango, activo: true };
        }

        const inicio = desdeNum - 1;
        const fin = Math.min(hastaNum, totalPreRango);
        const items = lista.slice(inicio, fin);
        const posiciones = items.map((_, idx) => inicio + idx + 1);

        return { items, posiciones, totalPreRango, activo: true };
    }

    const desdeNorm = normalizarClaveAlfabetica(desdeRaw);
    const hastaNorm = normalizarClaveAlfabetica(hastaRaw);

    const items = [];
    const posiciones = [];

    lista.forEach((asp, idx) => {
        const claveAlumno = normalizarClaveAlfabetica(`${asp.apellido || ''} ${asp.nombre || ''}`);
        if (desdeNorm && claveAlumno < desdeNorm) return;
        if (hastaNorm) {
            const prefijo = claveAlumno.slice(0, hastaNorm.length);
            if (prefijo > hastaNorm) return;
        }
        items.push(asp);
        posiciones.push(idx + 1);
    });

    return {
        items,
        posiciones,
        totalPreRango,
        activo: Boolean(desdeNorm || hastaNorm)
    };
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
            const promOficial = parseFloat(String(ex.promedio_general ?? alumno.promedio_general ?? alumno['Promedio'] ?? '').replace(',', '.'));
            const ordenOficial = parseInt(ex.orden_merito ?? alumno.orden_merito ?? alumno['Orden_De_Merito'], 10);
            const promedio = !isNaN(promOficial)
                ? promOficial
                : (notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / 3 : 0);
            const ordenMeritoOficial = (!isNaN(ordenOficial) && ordenOficial > 0) ? ordenOficial : null;
            return {
                ...alumno,
                datos_examen_oficial: ex,
                datos_examen: ex,
                promedioGeneral: promedio,
                ordenMeritoOficial: ordenMeritoOficial
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
            alumno['Nº de inscripcion'] ||
            alumno['N° de inscripcion'] ||
            alumno['Nº de inscripción'] ||
            alumno['N° de inscripción'] ||
            alumno.nro_inscripcion ||
            alumno.id_inscripcion ||
            alumno['N° de orden'] ||
            alumno['Nº de orden'] ||
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

        // El promedio de etapa siempre divide la suma de notas entre las 3 asignaturas (ausente suma 0)
        const promedio = notasValidas.length > 0
            ? notasValidas.reduce((a, b) => a + b, 0) / 3
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
    const etapaActiva = obtenerEtapaSeleccionada();
    if (etapaActiva === 'oficial') {
        alumnosConPromedio.sort((a, b) => {
            if (a.ordenMeritoOficial !== null && b.ordenMeritoOficial !== null) {
                return a.ordenMeritoOficial - b.ordenMeritoOficial;
            }
            if (a.ordenMeritoOficial !== null) return -1;
            if (b.ordenMeritoOficial !== null) return 1;
            return b.promedioGeneral - a.promedioGeneral;
        });
    } else {
        alumnosConPromedio.sort((a, b) => b.promedioGeneral - a.promedioGeneral);
    }

    // 2. Asignamos posición de mérito según la etapa seleccionada
    const alumnosConMerito = alumnosConPromedio.map((alumno, index) => ({
        ...alumno,
        ordenMerito: (etapaActiva === 'oficial' && alumno.ordenMeritoOficial !== null)
            ? alumno.ordenMeritoOficial
            : (index + 1)
    }));

    // 3. Leemos los filtros activos de la pantalla y normalizamos la búsqueda (sin DNI)
    const textoNombre = quitarAcentos((document.getElementById('buscador-nombre-alumno')?.value || '').toLowerCase().trim());
    const textoEscuela = quitarAcentos((document.getElementById('buscador-escuela-alumno')?.value || '').toLowerCase().trim());
    const comisionFiltro = (document.getElementById('filtro-global-comision')?.value || 'todas').trim();
    const textoBusquedaCrudo = '';
    const textoBusqueda = quitarAcentos(textoBusquedaCrudo);

    const minInput = parseInt(document.getElementById('filtro-merito-min')?.value) || 1;
    const maxInput = parseInt(document.getElementById('filtro-merito-max')?.value) || alumnosConMerito.length;

    // 4. Aplicamos ambos filtros en simultáneo (Nombre, Apellido, Escuela, Departamento u Orden)
    return alumnosConMerito.filter(alumno => {
        const dentroDeRango = alumno.ordenMerito >= minInput && alumno.ordenMerito <= maxInput;
        if (!dentroDeRango) return false;
        if (comisionFiltro !== 'todas' && comisionFiltro !== '') {
            const comAlumno = String(alumno['Comisión'] ?? alumno['Comision'] ?? alumno.comision ?? '').trim();
            if (comAlumno !== comisionFiltro) return false;
        }
        if (!textoNombre && !textoEscuela) return true;

        const apellidoNorm = quitarAcentos((alumno['Apellido/s del alumno'] || alumno.apellido || '').toLowerCase());
        const nombreNorm = quitarAcentos((alumno['Nombre/s del alumno'] || alumno.nombre || '').toLowerCase());
        const nombreCompletoNorm = `${apellidoNorm}, ${nombreNorm}`;
        const nombreInvertidoNorm = `${nombreNorm} ${apellidoNorm}`;
        const escuelaNorm = quitarAcentos((alumno['Establecimiento escolar de donde proviene'] || alumno.colegio || '').toLowerCase());

        if (textoNombre) {
            const coincideNombre = nombreCompletoNorm.includes(textoNombre) ||
                nombreInvertidoNorm.includes(textoNombre) ||
                apellidoNorm.includes(textoNombre) ||
                nombreNorm.includes(textoNombre);
            if (!coincideNombre) return false;
        }

        if (textoEscuela) {
            if (!escuelaNorm.includes(textoEscuela)) return false;
        }

        return true;
        if (!textoBusqueda) return true;

        const apellido = quitarAcentos((alumno['Apellido/s del alumno'] || alumno.apellido || '').toLowerCase());
        const nombre = quitarAcentos((alumno['Nombre/s del alumno'] || alumno.nombre || '').toLowerCase());
        const nombreCompleto = `${apellido}, ${nombre}`;
        const escuela = quitarAcentos((alumno['Establecimiento escolar de donde proviene'] || alumno.colegio || '').toLowerCase());
        const depto = quitarAcentos((alumno['Departamento'] || alumno.departamento || '').toLowerCase());
        const orden = String(alumno['N° de orden'] || alumno['Nº de orden'] || alumno.id_inscripcion || '').toLowerCase();

        return (
            true ||
            apellido.includes(textoBusqueda) ||
            nombre.includes(textoBusqueda) ||
            escuela.includes(textoBusqueda) ||
            depto.includes(textoBusqueda) ||
            orden.includes(textoBusqueda)
        );
    });
}
