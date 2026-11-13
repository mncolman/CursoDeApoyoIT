// --- archivo: constancias.js ---
import * as Utils from './utils.js';

const STORAGE_KEY_PLANTILLA = 'it_unt_plantilla_constancia_v2';
const STORAGE_KEY_SUBTITULO = 'it_unt_subtitulo_constancia_v2';
const STORAGE_KEY_PIE = 'it_unt_pie_constancia_v2';

const SUBTITULO_DEFAULT = 'Curso de Apoyo - Ingreso a 1° del ciclo lectivo 2027';
const PIE_DEFAULT = 'Instituto Técnico - Universidad Nacional de Tucumán';
const PLANTILLA_DEFAULT =
    'Por la presente se deja constancia de que {{NOMBRE}}, D.N.I. N° {{DNI}}, estudiante del establecimiento educativo {{INSTITUCION}}, participa en calidad de aspirante en las instancias evaluativas correspondientes al Examen de Ingreso del Instituto Técnico de la Universidad Nacional de Tucumán.\n\n' +
    'Asimismo, se informa que el/la mencionado/a estudiante se encuentra afectado/a al cronograma oficial de evaluaciones en las siguientes fechas: 11 de noviembre, 13 de noviembre y 16 de noviembre del corriente año, siendo su concurrencia de carácter obligatorio en cada una de dichas jornadas.\n\n' +
    'A solicitud de la parte interesada y al solo efecto de ser presentada ante las autoridades escolares que corresponda para la justificación de las inasistencias en los días detallados, se extiende la presente en la ciudad de San Miguel de Tucumán, a los 13 días del mes de noviembre de 2026.';

const estado = {
    getAspirantes: () => [],
    seleccionados: new Set(),
    descargados: new Set(),
    mapaPorClave: new Map()
};

/** Escapa caracteres HTML especiales para evitar inyección al renderizar filas. */
function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Normaliza texto para búsqueda sin acentos ni distinción de mayúsculas. */
function normalizarTextoBusqueda(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/** Genera una clave única y estable para identificar a cada alumno en el modal. */
function obtenerClaveAlumno(alumno) {
    const { apellido, nombre, dniArchivo } = Utils.extraerDatosAlumnoConstancia(alumno);
    if (alumno.id_inscripcion !== undefined && alumno.id_inscripcion !== null && String(alumno.id_inscripcion).trim() !== '') {
        return `id_${String(alumno.id_inscripcion).trim()}`;
    }
    return `${dniArchivo}_${apellido}_${nombre}`.toLowerCase();
}

/** Lee un campo persistido en localStorage; respeta cadena vacía si el usuario la guardó así. */
function cargarCampoGuardado(clave, valorPorDefecto, permitirVacio = true) {
    const guardado = localStorage.getItem(clave);
    if (guardado === null) return valorPorDefecto;
    if (!permitirVacio && guardado.trim() === '') return valorPorDefecto;
    return guardado;
}

/** Persiste un campo de configuración en localStorage. */
function guardarCampo(clave, valor) {
    localStorage.setItem(clave, String(valor ?? ''));
}

/** Persiste el texto de la plantilla en localStorage. */
function guardarPlantilla(texto) {
    guardarCampo(STORAGE_KEY_PLANTILLA, texto);
}

/** Inserta un marcador (**1**, **2**, **3**) en la posición actual del cursor del textarea. */
function insertarMarcadorEnTextarea(textarea, marcador) {
    if (!textarea) return;
    const inicio = textarea.selectionStart ?? textarea.value.length;
    const fin = textarea.selectionEnd ?? textarea.value.length;
    const textoActual = textarea.value;

    textarea.value = textoActual.slice(0, inicio) + marcador + textoActual.slice(fin);
    const nuevaPos = inicio + marcador.length;
    textarea.focus();
    textarea.setSelectionRange(nuevaPos, nuevaPos);
    guardarPlantilla(textarea.value);
}

/** Ordena alfabéticamente por apellido y nombre y aplica el filtro del buscador del modal. */
function obtenerAspirantesOrdenadosYFiltrados(aspirantes, textoFiltro) {
    const filtroNorm = normalizarTextoBusqueda(textoFiltro);

    const ordenados = [...(aspirantes || [])].sort((a, b) => {
        const datosA = Utils.extraerDatosAlumnoConstancia(a);
        const datosB = Utils.extraerDatosAlumnoConstancia(b);
        const compApellido = datosA.apellido.localeCompare(datosB.apellido, 'es', { sensitivity: 'base' });
        if (compApellido !== 0) return compApellido;
        return datosA.nombre.localeCompare(datosB.nombre, 'es', { sensitivity: 'base' });
    });

    if (!filtroNorm) return ordenados;

    return ordenados.filter(alumno => {
        const { nombreCompleto, apellido, nombre, dni, institucion } = Utils.extraerDatosAlumnoConstancia(alumno);
        const textoAlumno = normalizarTextoBusqueda(`${apellido} ${nombre} ${nombreCompleto} ${dni} ${institucion}`);
        return textoAlumno.includes(filtroNorm);
    });
}

/** Actualiza los contadores y el estado del botón de descarga por lote (.zip). */
function actualizarContadoresYBotones(totalVisibles) {
    const elVisibles = document.getElementById('constanciasConteoVisibles');
    const elSeleccionados = document.getElementById('constanciasConteoSeleccionados');
    const btnZip = document.getElementById('btnDescargarConstanciasZip');

    if (elVisibles) elVisibles.textContent = String(totalVisibles);
    if (elSeleccionados) elSeleccionados.textContent = String(estado.seleccionados.size);
    if (btnZip) {
        btnZip.disabled = estado.seleccionados.size === 0;
    }
}

/** Dibuja las filas de la tabla de constancias manteniendo selección y estado de descarga. */
function renderizarTablaConstancias() {
    const tbody = document.getElementById('tbodyConstancias');
    const inputBuscador = document.getElementById('buscadorConstancias');
    if (!tbody) return;

    const lista = obtenerAspirantesOrdenadosYFiltrados(estado.getAspirantes(), inputBuscador?.value || '');
    estado.mapaPorClave.clear();

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    No se encontraron alumnos que coincidan con la búsqueda.
                </td>
            </tr>`;
        actualizarContadoresYBotones(0);
        return;
    }

    tbody.innerHTML = lista.map(alumno => {
        const clave = obtenerClaveAlumno(alumno);
        estado.mapaPorClave.set(clave, alumno);

        const { nombreCompleto, dni, institucion } = Utils.extraerDatosAlumnoConstancia(alumno);
        const estaSeleccionado = estado.seleccionados.has(clave);
        const fueDescargado = estado.descargados.has(clave);
        const badgeDescargado = fueDescargado
            ? `<span class="badge bg-success-subtle text-success border border-success-subtle ms-2"><i class="bi bi-check2-circle me-1"></i>Descargada</span>`
            : '';

        return `
            <tr class="${estaSeleccionado ? 'table-primary bg-opacity-10' : ''}" data-clave="${escaparHtml(clave)}">
                <td class="text-center">
                    <input type="checkbox" class="form-check-input chk-constancia-alumno"
                        data-clave="${escaparHtml(clave)}" ${estaSeleccionado ? 'checked' : ''}
                        aria-label="Seleccionar a ${escaparHtml(nombreCompleto)}">
                </td>
                <td class="fw-semibold">
                    ${escaparHtml(nombreCompleto)}${badgeDescargado}
                </td>
                <td class="text-center font-monospace">${escaparHtml(dni)}</td>
                <td class="small text-secondary">${escaparHtml(institucion)}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-azul-institucional btn-generar-constancia-individual"
                        data-clave="${escaparHtml(clave)}"
                        title="Descargar ${escaparHtml(Utils.generarNombreArchivoConstancia(alumno))}">
                        <i class="bi bi-file-earmark-pdf me-1"></i>Generar PDF
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    actualizarContadoresYBotones(lista.length);
}

/** Valida el cuerpo y devuelve la configuración completa de la constancia. */
function obtenerConfiguracionValidada() {
    const textarea = document.getElementById('textareaPlantillaConstancia');
    const inputSubtitulo = document.getElementById('inputSubtituloConstancia');
    const inputPie = document.getElementById('inputPieConstancia');

    const texto = (textarea?.value || '').trim();
    if (!texto) {
        Swal.fire('Atención', 'El cuerpo de la constancia no puede estar vacío.', 'warning');
        return null;
    }

    return {
        plantilla: textarea.value,
        subtitulo: inputSubtitulo ? inputSubtitulo.value : SUBTITULO_DEFAULT,
        piePagina: inputPie ? inputPie.value : PIE_DEFAULT
    };
}

/** Inicializa eventos y estado del modal de generación de constancias. */
export function inicializarModuloConstancias(getAspirantesFn) {
    estado.getAspirantes = typeof getAspirantesFn === 'function' ? getAspirantesFn : () => [];

    const modalEl = document.getElementById('modalConstancias');
    const textarea = document.getElementById('textareaPlantillaConstancia');
    const inputSubtitulo = document.getElementById('inputSubtituloConstancia');
    const inputPie = document.getElementById('inputPieConstancia');
    const buscador = document.getElementById('buscadorConstancias');
    const tbody = document.getElementById('tbodyConstancias');

    if (!modalEl || !textarea || !tbody) return;

    textarea.value = cargarCampoGuardado(STORAGE_KEY_PLANTILLA, PLANTILLA_DEFAULT, false);
    if (inputSubtitulo) {
        inputSubtitulo.value = cargarCampoGuardado(STORAGE_KEY_SUBTITULO, SUBTITULO_DEFAULT, true);
    }
    if (inputPie) {
        inputPie.value = cargarCampoGuardado(STORAGE_KEY_PIE, PIE_DEFAULT, true);
    }

    modalEl.addEventListener('shown.bs.modal', () => {
        renderizarTablaConstancias();
    });

    textarea.addEventListener('input', () => {
        guardarPlantilla(textarea.value);
    });

    inputSubtitulo?.addEventListener('input', () => {
        guardarCampo(STORAGE_KEY_SUBTITULO, inputSubtitulo.value);
    });

    inputPie?.addEventListener('input', () => {
        guardarCampo(STORAGE_KEY_PIE, inputPie.value);
    });

    // Botones de inserción rápida de marcadores ({{NOMBRE}}, {{DNI}}, {{INSTITUCION}})
    modalEl.querySelectorAll('[data-marcador-constancia]').forEach(btn => {
        btn.addEventListener('click', () => {
            const marcador = btn.getAttribute('data-marcador-constancia');
            insertarMarcadorEnTextarea(textarea, marcador);
        });
    });

    document.getElementById('btnRestaurarPlantillaConstancia')?.addEventListener('click', () => {
        textarea.value = PLANTILLA_DEFAULT;
        guardarPlantilla(PLANTILLA_DEFAULT);

        if (inputSubtitulo) {
            inputSubtitulo.value = SUBTITULO_DEFAULT;
            guardarCampo(STORAGE_KEY_SUBTITULO, SUBTITULO_DEFAULT);
        }
        if (inputPie) {
            inputPie.value = PIE_DEFAULT;
            guardarCampo(STORAGE_KEY_PIE, PIE_DEFAULT);
        }
    });

    document.getElementById('btnVistaPreviaConstancia')?.addEventListener('click', () => {
        const config = obtenerConfiguracionValidada();
        if (!config) return;

        const visibles = obtenerAspirantesOrdenadosYFiltrados(estado.getAspirantes(), buscador?.value || '');
        const alumnoEjemplo = visibles[0] || estado.getAspirantes()[0] || {
            apellido: 'PÉREZ',
            nombre: 'Juan Ignacio',
            dni: '46123456',
            colegio: 'Escuela de Comercio N° 1'
        };
        Utils.previsualizarConstanciaPDF(alumnoEjemplo, config);
    });

    buscador?.addEventListener('input', () => {
        renderizarTablaConstancias();
    });

    document.getElementById('btnSeleccionarVisiblesConstancias')?.addEventListener('click', () => {
        const visibles = obtenerAspirantesOrdenadosYFiltrados(estado.getAspirantes(), buscador?.value || '');
        visibles.forEach(alumno => {
            estado.seleccionados.add(obtenerClaveAlumno(alumno));
        });
        renderizarTablaConstancias();
    });

    document.getElementById('btnLimpiarSeleccionConstancias')?.addEventListener('click', () => {
        estado.seleccionados.clear();
        renderizarTablaConstancias();
    });

    // Delegación de eventos para checkboxes y botón individual "Generar PDF"
    tbody.addEventListener('change', (e) => {
        const chk = e.target.closest('.chk-constancia-alumno');
        if (!chk) return;
        const clave = chk.getAttribute('data-clave');
        if (chk.checked) {
            estado.seleccionados.add(clave);
        } else {
            estado.seleccionados.delete(clave);
        }
        const fila = chk.closest('tr');
        if (fila) fila.classList.toggle('table-primary', chk.checked);
        if (fila) fila.classList.toggle('bg-opacity-10', chk.checked);
        actualizarContadoresYBotones(estado.mapaPorClave.size);
    });

    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-generar-constancia-individual');
        if (!btn) return;
        const clave = btn.getAttribute('data-clave');
        const alumno = estado.mapaPorClave.get(clave);
        if (!alumno) return;

        const config = obtenerConfiguracionValidada();
        if (!config) return;

        const archivo = Utils.descargarConstanciaIndividualPDF(alumno, config);
        if (archivo) {
            estado.descargados.add(clave);
            renderizarTablaConstancias();
        }
    });

    // Descarga en lote (.zip) de todos los alumnos seleccionados
    document.getElementById('btnDescargarConstanciasZip')?.addEventListener('click', async () => {
        const config = obtenerConfiguracionValidada();
        if (!config) return;

        const ordenados = obtenerAspirantesOrdenadosYFiltrados(estado.getAspirantes(), '');
        const alumnosSeleccionados = [];
        const clavesSeleccionadasOrdenadas = [];

        ordenados.forEach(alumno => {
            const clave = obtenerClaveAlumno(alumno);
            if (estado.seleccionados.has(clave)) {
                alumnosSeleccionados.push(alumno);
                clavesSeleccionadasOrdenadas.push(clave);
            }
        });

        const ok = await Utils.descargarConstanciasEnZip(alumnosSeleccionados, config);
        if (ok) {
            clavesSeleccionadasOrdenadas.forEach(c => estado.descargados.add(c));
            renderizarTablaConstancias();
        }
    });
}
