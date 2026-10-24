import { EstadoDashboard } from './api.js';

// Función unificada para calcular y normalizar el promedio del alumno
function obtenerPromedioAlumno(alumno) {
    if (!alumno) return 0;

    // 1. Si ya viene precalculado por la proyección de etapa (filters.js) o el backend
    if (typeof alumno.promedioGeneral === 'number') return +alumno.promedioGeneral.toFixed(2);
    if (alumno.promedio_general !== undefined) return +(parseFloat(alumno.promedio_general) || 0).toFixed(2);
    if (alumno.datos_examen?.promedio_general !== undefined) return +(parseFloat(alumno.datos_examen.promedio_general) || 0).toFixed(2);

    // 2. Si no viene precalculado, promediamos las materias donde estuvo Presente (incluyendo nota 0)
    const ex = alumno.datos_examen;
    if (!ex) return 0;

    const materias = [
        { nota: ex.nota_final_matematica, estado: ex.estado_matematica },
        { nota: ex.nota_final_lengua, estado: ex.estado_lengua },
        { nota: ex.nota_final_dibujo, estado: ex.estado_dibujo }
    ];

    let suma = 0, cant = 0;
    materias.forEach(m => {
        const val = parseFloat(m.nota);
        if (!isNaN(val) && m.estado === 'Presente') {
            suma += val;
            cant++;
        }
    });

    return cant > 0 ? +(suma / cant).toFixed(2) : 0;
}


// =================================================================
// 1. CÁLCULO DE PROMEDIOS, MÁXIMOS Y DESCRIPCIONES POR INCISO
// =================================================================
export function calcularRendimientoIncisos(materia, alumnos) {
    if (!alumnos || alumnos.length === 0) {
        return { etiquetas: [], promedios: [], maximos: [], descripciones: {} };
    }

    const presentes = alumnos.filter(a => a.datos_examen?.[`estado_${materia}`] === "Presente");
    if (presentes.length === 0) {
        return { etiquetas: [], promedios: [], maximos: [], descripciones: {} };
    }

    // Normalizamos la estructura de exámenes (soporta Array u Objeto)
    const estructuraCruda = EstadoDashboard.examenes?.[materia] || {};
    const mapaEstructura = {};

    if (Array.isArray(estructuraCruda)) {
        estructuraCruda.forEach(item => {
            const clave = String(item.inciso ?? item.id ?? item.numero ?? '');
            mapaEstructura[clave] = {
                maximo: parseFloat(item.puntaje_maximo ?? item.puntos ?? item.maximo) || 10,
                descripcion: item.descripcion ?? item.enunciado ?? item.tema ?? ''
            };
        });
    } else {
        Object.entries(estructuraCruda).forEach(([clave, val]) => {
            if (typeof val === 'object' && val !== null) {
                mapaEstructura[clave] = {
                    maximo: parseFloat(val.puntaje_maximo ?? val.puntos ?? val.maximo) || 10,
                    descripcion: val.descripcion ?? val.enunciado ?? val.tema ?? ''
                };
            } else {
                mapaEstructura[clave] = {
                    maximo: parseFloat(val) || 10,
                    descripcion: ''
                };
            }
        });
    }

    // Acumulamos puntajes obtenidos por cada inciso
    const acumulador = {};

    presentes.forEach(alumno => {
        const incisosAlumno = alumno.datos_examen?.[`incisos_${materia}`] || {};
        Object.entries(incisosAlumno).forEach(([inciso, valor]) => {
            const puntaje = parseFloat(valor) || 0;
            if (!acumulador[inciso]) {
                acumulador[inciso] = { suma: 0, count: 0 };
            }
            acumulador[inciso].suma += puntaje;
            acumulador[inciso].count += 1;
        });
    });

    // Ordenamos las etiquetas numéricamente o por orden de clave
    const etiquetas = Object.keys(acumulador).sort((a, b) => {
        const numA = parseFloat(a), numB = parseFloat(b);
        return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
    });

    const promedios = [];
    const maximos = [];
    const descripciones = {};

    etiquetas.forEach(inciso => {
        const info = mapaEstructura[inciso] || { maximo: 10, descripcion: 'Sin descripción' };
        const data = acumulador[inciso];

        const prom = data.count > 0 ? data.suma / data.count : 0;
        promedios.push(parseFloat(prom.toFixed(2)));
        maximos.push(info.maximo);
        descripciones[inciso] = info.descripcion;
    });

    return { etiquetas, promedios, maximos, descripciones };
}

// =================================================================
// 2. RADAR CON CAPA BASE (MÁXIMO POSIBLE) Y TOOLTIP DESCRIPTIVO
// =================================================================
export function renderizarRadarDinamico(materia, idCanvas, colorBorde, colorFondo, alumnos) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) return;

    const chartExistente = Chart.getChart(canvas);
    if (chartExistente) chartExistente.destroy();

    const { etiquetas, promedios, maximos, descripciones } = calcularRendimientoIncisos(materia, alumnos);
    if (etiquetas.length === 0) return;

    const ctx = canvas.getContext('2d');

    // Radar con dos capas superpuestas
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: etiquetas,
            datasets: [
                // Capa 1 (Fondo): Puntaje Máximo Teórico
                {
                    label: 'Puntaje Máximo',
                    data: maximos,
                    borderColor: 'rgba(108, 117, 125, 0.4)',
                    backgroundColor: 'rgba(108, 117, 125, 0.08)',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: 'rgba(108, 117, 125, 0.58)',
                    fill: true
                },
                // Capa 2 (Frente): Rendimiento Real Obtenido
                {
                    label: 'Promedio Obtenido',
                    data: promedios,
                    borderColor: colorBorde,
                    backgroundColor: colorFondo,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: colorBorde,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 15 },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        backdropColor: 'transparent',
                        font: { size: 9 },
                        color: '#101111'
                    },
                    pointLabels: {
                        font: { size: 11, weight: 'bold' },
                        color: '#101111'

                    },
                    grid: { color: 'rgba(0, 0, 0, 0.07)' },
                    angleLines: { color: 'rgba(0, 0, 0, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        // Título del tooltip: Muestra el inciso y su descripción temática
                        title: (context) => {
                            const index = context[0].dataIndex;
                            const inciso = etiquetas[index];
                            const desc = descripciones[inciso];
                            return desc ? `Inciso ${inciso}: ${desc}` : `Inciso ${inciso}`;
                        },
                        // Etiqueta: Muestra el puntaje y el porcentaje relativo
                        label: (context) => {
                            const val = context.raw;
                            const max = maximos[context.dataIndex];
                            const pct = max > 0 ? ((val / max) * 100).toFixed(0) : 0;
                            return ` ${context.dataset.label}: ${val} pts (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}


// Función auxiliar defensiva: solo asigna si el elemento existe en el DOM
function asignarTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.innerText = valor;
    } else {
        console.warn(`⚠️ Elemento con id '${id}' no encontrado en el HTML.`);
    }
}

export function calcularKpisGlobales(alumnos) {
    if (!alumnos || alumnos.length === 0) return;

    // 1. Inscriptos y totales
    asignarTexto('kpi-inscriptos', alumnos.length);
    asignarTexto('cant-alumnos-total', alumnos.length);

    // 2. Alumnos que rindieron
    const rindieron = alumnos.filter(a => {
        const ex = a.datos_examen || {};
        return ex.estado_matematica === "Presente" ||
            ex.estado_lengua === "Presente" ||
            ex.estado_dibujo === "Presente";
    });
    asignarTexto('kpi-rindieron', rindieron.length);

    // 3. Métricas por materia
    const calcularMateria = (materia) => {
        const presentes = alumnos.filter(a => a.datos_examen?.[`estado_${materia}`] === "Presente");
        if (presentes.length > 0) {
            const notas = presentes.map(a => a.datos_examen[`nota_final_${materia}`]);
            const promedio = (notas.reduce((acc, v) => acc + v, 0) / notas.length).toFixed(2);
            const max = Math.max(...notas).toFixed(2);

            asignarTexto(`kpi-promedio-${materia}`, promedio);
            asignarTexto(`kpi-max-${materia}`, max);
        } else {
            asignarTexto(`kpi-promedio-${materia}`, "-");
            asignarTexto(`kpi-max-${materia}`, "-");
        }
    };

    calcularMateria('matematica');
    calcularMateria('lengua');
    calcularMateria('dibujo');

    asignarTexto('kpi-promedio-general', '-');
    asignarTexto('kpi-max-general', '-');
    // 4. Promedio General global
    if (rindieron.length > 0) {
        let sumaPromedios = 0;
        let maxGlobal = 0;

        rindieron.forEach(a => {
            const notas = [];
            const ex = a.datos_examen || {};
            if (ex.estado_matematica === "Presente") notas.push(ex.nota_final_matematica);
            if (ex.estado_lengua === "Presente") notas.push(ex.nota_final_lengua);
            if (ex.estado_dibujo === "Presente") notas.push(ex.nota_final_dibujo);

            const promAlumno = notas.reduce((acc, v) => acc + v, 0) / notas.length;
            sumaPromedios += promAlumno;
            if (promAlumno > maxGlobal) maxGlobal = promAlumno;
        });

        asignarTexto('kpi-promedio-general', (sumaPromedios / rindieron.length).toFixed(2));
        asignarTexto('kpi-max-general', maxGlobal.toFixed(2));
    }
}

// ==========================================
// 2. MINI-KPIS FILTRADOS (Basado en tu versión original que funciona)
// ==========================================
export function calcularMiniKpisFiltrados(alumnosFiltrados) {
    const elProm = document.getElementById('mini-kpi-promedio');
    const elMax = document.getElementById('mini-kpi-max');
    const elMin = document.getElementById('mini-kpi-min');
    const elMat = document.getElementById('mini-kpi-mat');
    const elLen = document.getElementById('mini-kpi-len');
    const elDib = document.getElementById('mini-kpi-dib');

    if (!alumnosFiltrados || alumnosFiltrados.length === 0) {
        if (elProm) elProm.innerText = '-';
        if (elMax) elMax.innerText = '-';
        if (elMin) elMin.innerText = '-';
        if (elMat) elMat.innerText = '-';
        if (elLen) elLen.innerText = '-';
        if (elDib) elDib.innerText = '-';
        return;
    }

    // Promedios generales del recorte
    const promedios = alumnosFiltrados.map(a => a.promedioGeneral || 0).filter(p => p > 0);

    if (promedios.length > 0) {
        const promGrupo = (promedios.reduce((acc, v) => acc + v, 0) / promedios.length).toFixed(2);
        const maxGrupo = Math.max(...promedios).toFixed(2);
        const minGrupo = Math.min(...promedios).toFixed(2);

        if (elProm) elProm.innerText = promGrupo;
        if (elMax) elMax.innerText = maxGrupo;
        if (elMin) elMin.innerText = minGrupo;
    } else {
        if (elProm) elProm.innerText = '-';
        if (elMax) elMax.innerText = '-';
        if (elMin) elMin.innerText = '-';
    }

    // Promedios por materia dentro del recorte (respetando tu lógica original)
    const promPorMateria = (materia) => {
        const pres = alumnosFiltrados.filter(a => {
            const ex = a.datos_examen || {};
            const estado = ex[`estado_${materia}`];
            const nota = parseFloat(ex[`nota_final_${materia}`]);
            return estado === "Presente" && !isNaN(nota);
        });

        if (pres.length === 0) return '-';

        const sum = pres.reduce((acc, a) => {
            const nota = parseFloat(a.datos_examen[`nota_final_${materia}`]) || 0;
            return acc + nota;
        }, 0);

        return (sum / pres.length).toFixed(2);
    };

    if (elMat) elMat.innerText = promPorMateria('matematica');
    if (elLen) elLen.innerText = promPorMateria('lengua');
    if (elDib) elDib.innerText = promPorMateria('dibujo');
}

export function inicializarFiltrosMerito() {
    const alumnos = EstadoDashboard.alumnos;
    if (!alumnos || alumnos.length === 0) return;

    const totalAlumnos = alumnos.length;

    const inputMax = document.getElementById('filtro-merito-max');
    inputMax.max = totalAlumnos;
    inputMax.placeholder = totalAlumnos;
}


export function renderizarTablaMerito(alumnos) {
    const tbody = document.getElementById('tabla-merito-cuerpo');
    const badgeFiltrados = document.getElementById('cant-alumnos-filtrados');
    if (!tbody) return;

    if (!alumnos || alumnos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    No se encontraron alumnos que coincidan con la búsqueda.
                </td>
            </tr>`;
        if (badgeFiltrados) badgeFiltrados.innerText = '0';
        return;
    }

    if (badgeFiltrados) badgeFiltrados.innerText = alumnos.length;

    let htmlFilas = '';

    alumnos.forEach(alumno => {
        const examen = alumno.datos_examen || {};
        // Notas por materia (o guión si no rindió la materia puntual)
        const notaMat = examen.estado_matematica === 'Presente' ? examen.nota_final_matematica.toFixed(2) : '-';
        const notaLen = examen.estado_lengua === 'Presente' ? examen.nota_final_lengua.toFixed(2) : '-';
        const notaDib = examen.estado_dibujo === 'Presente' ? examen.nota_final_dibujo.toFixed(2) : '-';

        // Badge para el puesto en orden de mérito
        const puestoBadge = alumno.ordenMerito <= 10
            ? `<span class="badge bg-warning text-dark fw-bold">#${alumno.ordenMerito}</span>`
            : `<span class="badge bg-light text-dark border">#${alumno.ordenMerito}</span>`;

        // Datos del alumno y comisión
        const apellido = alumno['Apellido/s del alumno'] || alumno.apellido || '';
        const nombre = alumno['Nombre/s del alumno'] || alumno.nombre || '';
        const nombreCompleto = (apellido && nombre) ? `${apellido}, ${nombre}` : (alumno['Nombre y Apellido'] || alumno['Alumno'] || 'Sin Nombre');

        const comision = alumno['Comisión'] || alumno['Comision'] || alumno['comision'] || '-';

        // Promedio: si es 0 muestra "Ausente"
        const celdaPromedio = alumno.promedioGeneral > 0
            ? `<span class="fw-bold text-primary">${alumno.promedioGeneral.toFixed(3)}</span>`
            : `<span class="badge bg-secondary-subtle text-secondary">Ausente</span>`;

        htmlFilas += `
            <tr>
                <td class="text-center">${puestoBadge}</td>
                <td class="fw-semibold">${nombreCompleto}</td>
                <td class="text-center font-monospace bold"><span class="badge bg-dark text-white fw-bold">${comision}</span> </td>
                <td class="text-center">${notaMat}</td>
                <td class="text-center">${notaLen}</td>
                <td class="text-center">${notaDib}</td>
                <td class="text-center">${celdaPromedio}</td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlFilas;
}





// Variable interna para recordar qué métrica está seleccionada
let metricaDistribucionActiva = 'general';

// =================================================================
// 1. CÁLCULO DE FRECUENCIAS POR RANGO (0 a 10)
// =================================================================
export function calcularDistribucionNotas(alumnos, metrica = 'general') {
    // 10 intervalos: [0-1), [1-2), ..., [9-10]
    const etiquetas = ['[0-1)', '[1-2)', '[2-3)', '[3-4)', '[4-5)', '[5-6)', '[6-7)', '[7-8)', '[8-9)', '[9-10]'];
    const frecuencias = new Array(10).fill(0);

    if (!alumnos || alumnos.length === 0) return { etiquetas, frecuencias };

    alumnos.forEach(alumno => {
        const ex = alumno.datos_examen || {};
        let nota = null;

        if (metrica === 'general') {
            // Solo postulantes que rindieron al menos una materia
            if (alumno.promedioGeneral > 0) {
                nota = alumno.promedioGeneral;
            }
        } else {
            // Materia puntual: solo presentes
            if (ex[`estado_${metrica}`] === 'Presente') {
                nota = ex[`nota_final_${metrica}`];
            }
        }

        if (nota !== null && !isNaN(nota)) {
            // Determinamos el intervalo (0 a 9)
            let bucket = Math.floor(nota);
            if (bucket >= 10) bucket = 9; // El 10 exacto entra en el último rango [9-10]
            if (bucket < 0) bucket = 0;
            frecuencias[bucket]++;
        }
    });

    return { etiquetas, frecuencias };
}


// =================================================================
// 2. RENDERIZADO DEL GRÁFICO DE BARRAS
// =================================================================
export function renderizarGraficoDistribucion(alumnos, metrica = null) {
    const canvas = document.getElementById('graficoDistribucionNotas');
    if (!canvas) return;

    if (metrica) metricaDistribucionActiva = metrica;

    const chartExistente = Chart.getChart(canvas);
    if (chartExistente) chartExistente.destroy();

    const { etiquetas, frecuencias } = calcularDistribucionNotas(alumnos, metricaDistribucionActiva);

    // Paleta de colores según la materia activa
const coloresPorMetrica = {
    general:    { borde: 'rgb(27, 57, 106)',   fondo: 'rgba(27, 57, 106, 0.45)' },  // Azul institucional principal
    matematica: { borde: 'rgb(172, 26, 33)',  fondo: 'rgba(172, 26, 33, 0.45)' },   // Bordó institucional
    lengua:     { borde: 'rgb(27, 57, 106)',   fondo: 'rgba(27, 57, 106, 0.45)' },   // Azul institucional
    dibujo:     { borde: 'rgb(73, 80, 87)',    fondo: 'rgba(73, 80, 87, 0.45)' }     // Gris carbón institucional
};

    const estilo = coloresPorMetrica[metricaDistribucionActiva] || coloresPorMetrica.general;
    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Cantidad de Alumnos',
                data: frecuencias,
                backgroundColor: estilo.fondo,
                borderColor: estilo.borde,
                borderWidth: 1.5,
                borderRadius: 5,
                maxBarThickness: 45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    title: { display: true, text: 'N° de Postulantes', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    title: { display: true, text: 'Rango de Calificación (Puntos)', font: { size: 11 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (ctx) => `Rango: ${ctx[0].label} pts`,
                        label: (ctx) => ` ${ctx.raw} alumno(s)`
                    }
                }
            }
        }
    });
}

let cacheAlumnosContenidos = [];
let cacheEstructuraExamenes = {};

/**
 * Llamá a esta función cuando carguen los datos o cuando cambie el filtro de Orden de Mérito.
 * @param {Array} alumnosFiltrados - Lista de alumnos dentro del corte actual.
 * @param {Object} estructuraExamenes - EstadoDashboard.examenes (con las descripciones y puntajes máximos).
 */
export function actualizarRankingContenidos(alumnosFiltrados, estructuraExamenes = null) {
    if (!alumnosFiltrados || !Array.isArray(alumnosFiltrados)) return;

    cacheAlumnosContenidos = alumnosFiltrados;
    cacheEstructuraExamenes = estructuraExamenes || (window.EstadoDashboard?.examenes) || {};

    // Listeners de los selectores (usamos onchange para no acumular eventos repetidos)
    const selectOrden = document.getElementById('orden-tabla-contenidos');
    if (selectOrden) selectOrden.onchange = () => renderizarTablaContenidos();

    const selectMateria = document.getElementById('filtro-materia-contenidos');
    if (selectMateria) selectMateria.onchange = () => renderizarTablaContenidos();

    renderizarTablaContenidos();
}

// Auxiliar para leer de forma flexible la descripción y el puntaje máximo según cómo venga en EstadoDashboard.examenes
function obtenerMetaInciso(estructuraMateria, idInciso) {
    if (!estructuraMateria) return { descripcion: `Inciso ${idInciso}`, puntajeMax: 0 };

    // Caso 1: Viene como Array de objetos -> [{ inciso: "1", descripcion: "...", puntaje_maximo: 2 }, ...]
    if (Array.isArray(estructuraMateria)) {
        const encontrado = estructuraMateria.find(item =>
            String(item.inciso ?? item.id ?? item.numero) === String(idInciso)
        );
        if (encontrado) {
            return {
                descripcion: encontrado.descripcion || encontrado.contenido || encontrado.tema || `Inciso ${idInciso}`,
                puntajeMax: parseFloat(encontrado.puntaje_maximo ?? encontrado.puntaje ?? encontrado.max ?? encontrado.valor ?? 0) || 0
            };
        }
    }

    // Caso 2: Viene como Objeto indexado -> { "1": { descripcion: "...", puntaje_maximo: 2 } }
    if (typeof estructuraMateria === 'object' && estructuraMateria[idInciso] !== undefined) {
        const item = estructuraMateria[idInciso];
        if (typeof item === 'object' && item !== null) {
            return {
                descripcion: item.descripcion || item.contenido || item.tema || `Inciso ${idInciso}`,
                puntajeMax: parseFloat(item.puntaje_maximo ?? item.puntaje ?? item.max ?? item.valor ?? 0) || 0
            };
        }
    }

    return { descripcion: `Ejercicio / Inciso ${idInciso}`, puntajeMax: 0 };
}


function renderizarTablaContenidos() {
    const tbody = document.getElementById('tbody-ranking-contenidos');
    if (!tbody) return;

    const criterioOrden = document.getElementById('orden-tabla-contenidos')?.value || 'alcanzada_desc';
    const filtroMateria = document.getElementById('filtro-materia-contenidos')?.value || 'TODAS';

    const configuracionMaterias = [
        {
            clave: 'matematica',
            nombre: 'Matemática',
            style: 'background-color: #ac1a21; color: #ffffff;', // Bordó institucional
            campoIncisos: 'incisos_matematica',
            campoEstado: 'estado_matematica'
        },
        {
            clave: 'lengua',
            nombre: 'Lengua',
            style: 'background-color: #081e42; color: #ffffff;', // Azul institucional
            campoIncisos: 'incisos_lengua',
            campoEstado: 'estado_lengua'
        },
        {
            clave: 'dibujo',
            nombre: 'Dibujo',
            style: 'background-color: #495057; color: #ffffff;', // Gris oscuro personalizado
            campoIncisos: 'incisos_dibujo',
            campoEstado: 'estado_dibujo'
        }
    ];

    const listaContenidos = [];

    configuracionMaterias.forEach(mat => {
        if (filtroMateria !== 'TODAS' && filtroMateria !== mat.clave) return;

        const acumuladorIncisos = {}; // { "1": { suma: 0, presentes: 0, maxObservado: 0 } }

        // Recorremos los alumnos del corte actual
        cacheAlumnosContenidos.forEach(al => {
            const ex = al.datos_examen;
            if (!ex || ex[mat.campoEstado] === 'Ausente') return;

            const incisosAlumno = ex[mat.campoIncisos];
            if (!incisosAlumno || typeof incisosAlumno !== 'object') return;

            Object.entries(incisosAlumno).forEach(([idInciso, valorNota]) => {
                const puntos = parseFloat(valorNota);
                if (isNaN(puntos)) return;

                if (!acumuladorIncisos[idInciso]) {
                    acumuladorIncisos[idInciso] = { suma: 0, presentes: 0, maxObservado: 0 };
                }
                acumuladorIncisos[idInciso].suma += puntos;
                acumuladorIncisos[idInciso].presentes++;
                if (puntos > acumuladorIncisos[idInciso].maxObservado) {
                    acumuladorIncisos[idInciso].maxObservado = puntos;
                }
            });
        });

        const estructuraMat = cacheEstructuraExamenes[mat.clave] || cacheEstructuraExamenes[mat.nombre.toLowerCase()];

        Object.entries(acumuladorIncisos).forEach(([idInciso, datos]) => {
            const meta = obtenerMetaInciso(estructuraMat, idInciso);
            const puntajeMaximo = meta.puntajeMax > 0 ? meta.puntajeMax : datos.maxObservado;
            const puntuacionAlcanzada = datos.presentes > 0 ? +(datos.suma / datos.presentes).toFixed(2) : 0;
            const porcentajeExito = puntajeMaximo > 0 ? Math.round((puntuacionAlcanzada / puntajeMaximo) * 100) : 0;

            listaContenidos.push({
                materiaNombre: mat.nombre,
                style: mat.style,
                idInciso,
                descripcion: meta.descripcion,
                puntajeMaximo,
                puntuacionAlcanzada,
                porcentajeExito
            });
        });
    });

    // Ordenamos según el selector elegido por el usuario
    listaContenidos.sort((a, b) => {
        switch (criterioOrden) {
            case 'exito_desc':
                return b.porcentajeExito - a.porcentajeExito;
            case 'exito_asc':
                return a.porcentajeExito - b.porcentajeExito;
            case 'maxima_desc':
                return b.puntajeMaximo - a.puntajeMaximo;
            case 'maxima_asc':
                return a.puntajeMaximo - b.puntajeMaximo;
            default:
                return b.porcentajeExito - a.porcentajeExito;
        }
    });

    if (listaContenidos.length === 0) {
        const etapaActiva = document.getElementById('filtro-etapa-evaluacion')?.value || 'oficial';
        const msg = etapaActiva !== 'oficial'
            ? 'El ranking por incisos es exclusivo del Examen Oficial de Ingreso (las etapas del cursillo evalúan nota global por área).'
            : 'No hay datos de incisos disponibles para el filtro actual.';
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted py-4">${msg}</td></tr>`;
        return;
    }
    tbody.innerHTML = listaContenidos.map((item, idx) => {
        // 1. Calculamos el porcentaje y el color para este ítem específico
        const porc = item.porcentajeExito || 0;
        const badgeColor = porc >= 60 ? 'bg-success' : (porc >= 40 ? 'bg-warning text-dark' : 'bg-danger');

        return `
        <tr>
            <td class="text-muted fw-bold">${idx + 1}</td>
            <td class="text-start">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge" style="${item.style} font-size: 0.68rem;">
                        ${item.materiaNombre.substring(0, 3).toUpperCase()} ${item.idInciso}
                    </span>
                    <span class="fw-semibold text-dark">${item.descripcion}</span>
                </div>
            </td>
            <td class="fw-semibold text-secondary">${item.puntajeMaximo > 0 ? item.puntajeMaximo.toFixed(2) : '-'}</td>
            <td class="fw-semibold">${item.puntuacionAlcanzada.toFixed(2)}</td>
            <td>
                <span class="badge ${badgeColor}" style="min-width: 58px;">
                    ${porc.toFixed(1)}%
                </span>
            </td>
        </tr>
    `;
    }).join('');
}








// =================================================================
// 1. LLENAR EL SELECTOR DE COMISIONES AUTOMÁTICAMENTE
// =================================================================
export function inicializarSelectorComisiones(alumnos) {
    const select = document.getElementById('select-filtro-comision');
    if (!select) return;

    // Extraemos las comisiones únicas y las ordenamos
    const comisionesSet = new Set();
    alumnos.forEach(a => {
        const comVal = a['Comisión'] ?? a['Comision'] ?? a.comision;
        if (comVal !== undefined && comVal !== null && comVal !== '' && String(comVal).trim() !== '-') {
            comisionesSet.add(String(comVal).trim());
        }
    });

    const comisionesOrdenadas = Array.from(comisionesSet).sort((a, b) => Number(a) - Number(b));

    // Mantenemos la opción "Todas" y agregamos el resto
    let optionsHtml = '<option value="todas">🌐 Todas (Global)</option>';
    comisionesOrdenadas.forEach(com => {
        optionsHtml += `<option value="${com}">Comisión ${com}</option>`;
    });

    select.innerHTML = optionsHtml;
}





// =================================================================
// 2. RENDERIZADO DEL GRÁFICO DE COMISIONES (Agrupado o Comparativo)
// =================================================================
export function renderizarGraficoComisiones(alumnos, comisionSeleccionada = 'todas') {
    const canvas = document.getElementById('graficoComisiones');
    if (!canvas) return;

    const chartExistente = Chart.getChart(canvas);
    if (chartExistente) chartExistente.destroy();

    const ctx = canvas.getContext('2d');

    // 🔹 MODO 1: COMPARATIVA GENERAL (Todas las comisiones lado a lado)
    if (comisionSeleccionada === 'todas') {
        // Agrupamos datos por comisión
        const mapaComisiones = {}; // { "1": { matSum: 0, matCount: 0, ... } }

        alumnos.forEach(a => {
            const com = String(a['Comisión'] ?? a['Comision'] ?? a.comision ?? 'Sin Comisión').trim();
            if (!mapaComisiones[com]) {
                mapaComisiones[com] = {
                    matSuma: 0, matCant: 0,
                    lenSuma: 0, lenCant: 0,
                    dibSuma: 0, dibCant: 0
                };
            }

            const ex = a.datos_examen || {};
            if (ex.estado_matematica === 'Presente') {
                mapaComisiones[com].matSuma += ex.nota_final_matematica;
                mapaComisiones[com].matCant++;
            }
            if (ex.estado_lengua === 'Presente') {
                mapaComisiones[com].lenSuma += ex.nota_final_lengua;
                mapaComisiones[com].lenCant++;
            }
            if (ex.estado_dibujo === 'Presente') {
                mapaComisiones[com].dibSuma += ex.nota_final_dibujo;
                mapaComisiones[com].dibCant++;
            }
        });

        const etiquetasComisiones = Object.keys(mapaComisiones).sort((a, b) => Number(a) - Number(b));

        const datosMat = etiquetasComisiones.map(com => {
            const d = mapaComisiones[com];
            return d.matCant > 0 ? parseFloat((d.matSuma / d.matCant).toFixed(2)) : 0;
        });

        const datosLen = etiquetasComisiones.map(com => {
            const d = mapaComisiones[com];
            return d.lenCant > 0 ? parseFloat((d.lenSuma / d.lenCant).toFixed(2)) : 0;
        });

        const datosDib = etiquetasComisiones.map(com => {
            const d = mapaComisiones[com];
            return d.dibCant > 0 ? parseFloat((d.dibSuma / d.dibCant).toFixed(2)) : 0;
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: etiquetasComisiones.map(c => `Comisión ${c}`),
                datasets: [
                    {
                        label: 'Matemática',
                        data: datosMat,
                        backgroundColor: 'rgba(172, 26, 33, 0.85)', // Bordó institucional
                        borderColor: '#ac1a21',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Lengua',
                        data: datosLen,
                        backgroundColor: 'rgba(27, 57, 106, 0.85)', // Azul institucional
                        borderColor: '#1b396a',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Dibujo',
                        data: datosDib,
                        backgroundColor: 'rgba(73, 80, 87, 0.85)', // Gris institucional / Carbón
                        borderColor: '#495057',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: { stepSize: 2 },
                        title: { display: true, text: 'Promedio de Calificación (0 a 10)' }
                    },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        return;
    }

    // 🔹 MODO 2: DETALLE DE UNA COMISIÓN VS MEDIA GENERAL
    const alumnosComision = alumnos.filter(a => String(a['Comisión'] ?? a['Comision'] ?? a.comision).trim() === comisionSeleccionada);

    // Calculamos promedio de la comisión elegida
    let matCom = 0, lenCom = 0, dibCom = 0;
    let matComC = 0, lenComC = 0, dibComC = 0;

    alumnosComision.forEach(a => {
        const ex = a.datos_examen || {};
        if (ex.estado_matematica === 'Presente') { matCom += ex.nota_final_matematica; matComC++; }
        if (ex.estado_lengua === 'Presente') { lenCom += ex.nota_final_lengua; lenComC++; }
        if (ex.estado_dibujo === 'Presente') { dibCom += ex.nota_final_dibujo; dibComC++; }
    });

    const promMatCom = matComC > 0 ? matCom / matComC : 0;
    const promLenCom = lenComC > 0 ? lenCom / lenComC : 0;
    const promDibCom = dibComC > 0 ? dibCom / dibComC : 0;

    // Calculamos promedio general de TODA la academia (como referencia)
    let matGen = 0, lenGen = 0, dibGen = 0;
    let matGenC = 0, lenGenC = 0, dibGenC = 0;

    alumnos.forEach(a => {
        const ex = a.datos_examen || {};
        if (ex.estado_matematica === 'Presente') { matGen += ex.nota_final_matematica; matGenC++; }
        if (ex.estado_lengua === 'Presente') { lenGen += ex.nota_final_lengua; lenGenC++; }
        if (ex.estado_dibujo === 'Presente') { dibGen += ex.nota_final_dibujo; dibGenC++; }
    });

    const promMatGen = matGenC > 0 ? matGen / matGenC : 0;
    const promLenGen = lenGenC > 0 ? lenGen / lenGenC : 0;
    const promDibGen = dibGenC > 0 ? dibGen / dibGenC : 0;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Matemática', 'Lengua', 'Dibujo'],
            datasets: [
                {
                    label: `Comisión ${comisionSeleccionada}`,
                    data: [promMatCom.toFixed(2), promLenCom.toFixed(2), promDibCom.toFixed(2)],
                    backgroundColor: 'rgba(27, 57, 106, 0.85)', // Azul institucional principal
                    borderColor: '#1b396a',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    maxBarThickness: 60
                },
                {
                    label: 'Media General (Academia)',
                    data: [promMatGen.toFixed(2), promLenGen.toFixed(2), promDibGen.toFixed(2)],
                    backgroundColor: 'rgba(108, 117, 125, 0.35)', // Gris translúcido de referencia
                    borderColor: '#6c757d',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    borderRadius: 6,
                    maxBarThickness: 60
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { stepSize: 2 },
                    title: { display: true, text: 'Calificación Promedio' }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

export function renderizarTablaComisiones(alumnosFiltrados) {
    const tbody = document.getElementById('tabla-comisiones-cuerpo');
    if (!tbody) return;

    if (!alumnosFiltrados || alumnosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No hay alumnos en este rango de mérito.</td></tr>`;
        return;
    }

    // 1. Agrupamos por comisión asegurando tipos numéricos
    const mapa = {};

    alumnosFiltrados.forEach(a => {
        const com = String(a['Comisión'] ?? a['Comision'] ?? a.comision ?? 'Sin Comisión').trim();
        if (!mapa[com]) {
            mapa[com] = {
                totalAlumnos: 0,
                matSuma: 0, matCant: 0,
                lenSuma: 0, lenCant: 0,
                dibSuma: 0, dibCant: 0,
                genSuma: 0, genCant: 0
            };
        }

        mapa[com].totalAlumnos++;
        const ex = a.datos_examen || {};

        // Materias individuales
        const notaMat = parseFloat(ex.nota_final_matematica);
        if (ex.estado_matematica === 'Presente' && !isNaN(notaMat)) {
            mapa[com].matSuma += notaMat;
            mapa[com].matCant++;
        }

        const notaLen = parseFloat(ex.nota_final_lengua);
        if (ex.estado_lengua === 'Presente' && !isNaN(notaLen)) {
            mapa[com].lenSuma += notaLen;
            mapa[com].lenCant++;
        }

        const notaDib = parseFloat(ex.nota_final_dibujo);
        if (ex.estado_dibujo === 'Presente' && !isNaN(notaDib)) {
            mapa[com].dibSuma += notaDib;
            mapa[com].dibCant++;
        }


        // En lugar de leer a.promedioGeneral directamente:
        const promAlumno = obtenerPromedioAlumno(a);

        if (promAlumno > 0) {
            mapa[com].genSuma += promAlumno;
            mapa[com].genCant++;
        }

    });

    // 2. Mapeamos a array estructurado
    const comisionesArray = Object.keys(mapa).map(com => {
        const d = mapa[com];
        return {
            comision: com,
            totalAlumnos: d.totalAlumnos,
            promMat: d.matCant > 0 ? d.matSuma / d.matCant : 0,
            promLen: d.lenCant > 0 ? d.lenSuma / d.lenCant : 0,
            promDib: d.dibCant > 0 ? d.dibSuma / d.dibCant : 0,
            promGen: d.genCant > 0 ? d.genSuma / d.genCant : 0
        };
    });

    // 3. Criterio de orden (toma el valor actual del select o 'comision' por defecto)
    const selectOrden = document.getElementById('select-ordenar-comisiones');
    const criterioOrden = selectOrden ? selectOrden.value : 'comision';

    comisionesArray.sort((a, b) => {
        switch (criterioOrden) {
            case 'general':
                return b.promGen - a.promGen;
            case 'matematica':
                return b.promMat - a.promMat;
            case 'lengua':
                return b.promLen - a.promLen;
            case 'dibujo':
                return b.promDib - a.promDib;
            case 'alumnos':
                return b.totalAlumnos - a.totalAlumnos;
            case 'comision':
            default:
                return Number(a.comision) - Number(b.comision);
        }
    });

    // 4. Armamos el HTML directamente con los datos calculados
    let html = '';
    comisionesArray.forEach(d => {
        const pMat = d.promMat > 0 ? d.promMat.toFixed(2) : '-';
        const pLen = d.promLen > 0 ? d.promLen.toFixed(2) : '-';
        const pDib = d.promDib > 0 ? d.promDib.toFixed(2) : '-';
        const pGen = d.promGen > 0 ? d.promGen.toFixed(2) : '-';

        html += `
            <tr>
                <td class="fw-semibold text-nowrap">Com. ${d.comision}</td>
                <td class="text-center text-nowrap"><span class="badge bg-primary-subtle text-primary px-2 py-1">${d.totalAlumnos} alumnos</span></td>
                <td class="text-center text-nowrap">${pMat}</td>
                <td class="text-center text-nowrap">${pLen}</td>
                <td class="text-center text-nowrap">${pDib}</td>
                <td class="text-center text-nowrap fw-bold text-success">${pGen}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}


// Función auxiliar interna en ui.js
function obtenerBancoDocentesSesion() {
    try {
        return JSON.parse(sessionStorage.getItem('bancoDocentes') || '{"mapaComisionMateria":{},"docentes":{}}');
    } catch {
        return { mapaComisionMateria: {}, docentes: {} };
    }
}

// =================================================================
// 1. CÁLCULO DE PROMEDIOS INDIVIDUALES Y POR COMISIÓN
// =================================================================
export function procesarMetricasDocentesCompletas(alumnosFiltrados) {
    const { docentes, mapaComisionMateria } = obtenerBancoDocentesSesion();
    const listado = [];

    Object.entries(docentes).forEach(([nombreDocente, info]) => {
        const area = info.area || '';
        const areaKey = area.toLowerCase();
        const comisionesDocente = info.comisiones || [];

        const detalleComisiones = {};
        let sumaNotasDocente = 0;
        let cantAlumnosDocente = 0;

        comisionesDocente.forEach(comNum => {
            detalleComisiones[comNum] = { suma: 0, cant: 0, promedio: 0 };
        });

        alumnosFiltrados.forEach(alumno => {
            const comAlumno = Number(alumno['Comisión'] ?? alumno['Comision']);
            if (!comisionesDocente.includes(comAlumno)) return;

            // Verificamos si este docente estaba asignado a la comisión y materia
            const clave = `${comAlumno}_${areaKey}`;
            const asignados = mapaComisionMateria[clave] || [];
            if (!asignados.includes(nombreDocente)) return;

            const ex = alumno.datos_examen || {};
            const estado = ex[`estado_${areaKey}`];
            const nota = parseFloat(ex[`nota_final_${areaKey}`]);

            if (estado === 'Presente' && !isNaN(nota)) {
                detalleComisiones[comAlumno].suma += nota;
                detalleComisiones[comAlumno].cant++;
                sumaNotasDocente += nota;
                cantAlumnosDocente++;
            }
        });

        // Calculamos promedio individual de cada comisión
        Object.keys(detalleComisiones).forEach(comNum => {
            const d = detalleComisiones[comNum];
            d.promedio = d.cant > 0 ? parseFloat((d.suma / d.cant).toFixed(2)) : 0;
        });

        const promedioGlobal = cantAlumnosDocente > 0
            ? parseFloat((sumaNotasDocente / cantAlumnosDocente).toFixed(2))
            : 0;

        listado.push({
            docente: nombreDocente,
            area: area,
            areaKey: areaKey,
            comisiones: comisionesDocente,
            detalleComisiones: detalleComisiones,
            cantAlumnos: cantAlumnosDocente,
            promedioGlobal: promedioGlobal
        });
    });

    return listado;
}




// =================================================================
// 2. RENDERIZADO DE RADARES POR ÁREA (Con Fallback si < 3 docentes)
// =================================================================
export function renderizarRadarsDocentes(alumnosFiltrados) {
    const datos = procesarMetricasDocentesCompletas(alumnosFiltrados);

    const configs = {
        matematica: {
            idCanvas: 'radarDocentesMatematica',
            borde: 'rgb(138, 0, 0)',
            fondo: 'rgba(235, 54, 54, 0.25)'
        },
        lengua: {
            idCanvas: 'radarDocentesLengua',
            borde: 'rgb(4, 19, 87)',
            fondo: 'rgba(75, 77, 192, 0.25)'
        },
        dibujo: {
            idCanvas: 'radarDocentesDibujo',
            borde: 'rgb(50, 50, 50)',
            fondo: 'rgba(108, 117, 125, 0.25)'
        }
    };

    Object.entries(configs).forEach(([areaKey, cfg]) => {
        const canvas = document.getElementById(cfg.idCanvas);
        if (!canvas) return;

        const existente = Chart.getChart(canvas);
        if (existente) existente.destroy();

        const docentesArea = datos.filter(d => d.areaKey === areaKey);
        if (docentesArea.length === 0) return;

        const ctx = canvas.getContext('2d');
        const etiquetas = docentesArea.map(d => d.docente);
        const promedios = docentesArea.map(d => d.promedioGlobal);

        // Si son menos de 3 docentes, un radar pierde sentido: usamos barras
        if (docentesArea.length < 3) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: etiquetas,
                    datasets: [{
                        label: 'Promedio Global',
                        data: promedios,
                        backgroundColor: cfg.fondo,
                        borderColor: cfg.borde,
                        borderWidth: 1.5,
                        borderRadius: 4,
                        maxBarThickness: 50
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, max: 10, ticks: { stepSize: 2 } },
                        x: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
            return;
        }

        // Radar normal para 3 o más docentes
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Promedio General',
                    data: promedios,
                    borderColor: cfg.borde,
                    backgroundColor: cfg.fondo,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: cfg.borde,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: 10 },
                scales: {
                    r: {
                        beginAtZero: true,
                        suggestedMax: 10,
                        ticks: { stepSize: 2, backdropColor: 'transparent', font: { size: 9 } },
                        pointLabels: { font: { size: 10, weight: 'bold' }, color: '#333' },
                        grid: { color: 'rgba(0, 0, 0, 0.08)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => ` Promedio: ${c.raw} pts`
                        }
                    }
                }
            }
        });
    });
}

// =================================================================
// 3. TABLA CON DESGLOSE POR COMISIÓN Y ORDENAMIENTO
// =================================================================
export function renderizarTablaDocentes(alumnosFiltrados) {
    const tbody = document.getElementById('tabla-docentes-cuerpo');
    if (!tbody) return;

    const datos = procesarMetricasDocentesCompletas(alumnosFiltrados);
    if (datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay datos docentes disponibles.</td></tr>`;
        return;
    }

    const selectOrden = document.getElementById('select-ordenar-docentes-tabla');
    const criterio = selectOrden ? selectOrden.value : 'promedio-mayor';

    datos.sort((a, b) => {
        switch (criterio) {
            case 'promedio-menor':
                return a.promedioGlobal - b.promedioGlobal;
            case 'alumnos':
                return b.cantAlumnos - a.cantAlumnos;
            case 'nombre':
                return a.docente.localeCompare(b.docente);
            case 'promedio-mayor':
            default:
                return b.promedioGlobal - a.promedioGlobal;
        }
    });

    let html = '';
    datos.forEach(d => {
        // Badges con el desglose de cada comisión
        const detalleBadges = d.comisiones.map(com => {
            const prom = d.detalleComisiones[com]?.promedio || 0;
            const cant = d.detalleComisiones[com]?.cant || 0;
            return `<span class="badge bg-light text-dark border me-1 mb-1">
                        Com. ${com}: <strong>${prom > 0 ? prom.toFixed(2) : '-'}</strong> <small class="text-muted">(${cant} al.)</small>
                    </span>`;
        }).join('');

        const badgeArea = d.areaKey === 'matematica' ? 'bg-danger-subtle text-danger' :
            d.areaKey === 'lengua' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary';

        html += `
            <tr>
                <td class="fw-bold text-nowrap">${d.docente}</td>
                <td class="text-center text-nowrap"><span class="badge ${badgeArea} px-2 py-1">${d.area}</span></td>
                <td>${detalleBadges}</td>
                <td class="text-center text-nowrap">${d.cantAlumnos}</td>
                <td class="text-center text-nowrap fw-bold text-success">${d.promedioGlobal > 0 ? d.promedioGlobal.toFixed(2) : '-'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}









// alumnos sub tab
let chartApilado = null;
const LIMITE_TOP_GRAFICO = 10;

// Guardamos referencias para re-renderizar al cambiar controles internos
let cacheAlumnosEnCorte = [];
let cachePadronCompleto = [];

function normalizarDepartamento(deptoRaw) {
    if (!deptoRaw) return 'Sin especificar';
    let limpio = String(deptoRaw).trim();
    const check = limpio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (check.includes('tucunan') || check.includes('san miguel') || check === 'capital' || check.includes('s.m.')) {
        return 'San Miguel de Tucumán';
    }
    return limpio;
}



/**
 * Llamá a esta función cada vez que carguen los datos o cambie tu filtro global de Orden de Mérito.
 * @param {Array} alumnosFiltradosPorCorte - Lista de alumnos dentro del rango de mérito seleccionado.
 * @param {Array} padronTotalGlobal - (Opcional) Lista completa sin recortar (EstadoDashboard.alumnos).
 */
export function actualizarPestanaAlumnos(alumnosFiltradosPorCorte, padronTotalGlobal = null) {
    if (!alumnosFiltradosPorCorte || !Array.isArray(alumnosFiltradosPorCorte)) return;

    cacheAlumnosEnCorte = alumnosFiltradosPorCorte;
    // Si no nos pasan el padrón total, usamos EstadoDashboard.alumnos o la misma lista
    cachePadronCompleto = padronTotalGlobal || (window.EstadoDashboard?.alumnos) || alumnosFiltradosPorCorte;

    // Vinculamos eventos de controles internos
    const selectAgrupar = document.getElementById('select-agrupar-procedencia');
    if (selectAgrupar) selectAgrupar.onchange = () => ejecutarRenderizadoProcedencia();

    const selectOrden = document.getElementById('orden-tabla-instituciones');
    if (selectOrden) selectOrden.onchange = () => ejecutarRenderizadoProcedencia();

    // Aseguramos redimensionado del gráfico al abrir la pestaña
    const tabBtn = document.querySelector('[data-bs-target="#subtab-alumnos"]');
    if (tabBtn && !tabBtn.dataset.listenerAttached) {
        tabBtn.addEventListener('shown.bs.tab', () => {
            if (chartApilado) chartApilado.resize();
        });
        tabBtn.dataset.listenerAttached = 'true';
    }

    ejecutarRenderizadoProcedencia();
}

function normalizarAlumno(al) {
    const apellido = String(al["Apellido/s del alumno"] || al.apellido || '').trim();
    const nombre = String(al["Nombre/s del alumno"] || al.nombre || '').trim();
    const dni = String(al["Nº de documento del alumno (sin puntos)"] || al.dni || '').trim();
    const escuela = String(al["Establecimiento escolar de donde proviene"] || al.colegio || 'Sin especificar').trim();
    const depto = normalizarDepartamento(al["Departamento"] || al.departamento);

    return {
        ...al,
        nombreCompleto: `${apellido}, ${nombre}`,
        dniLimpio: dni,
        escuelaLimpia: escuela || 'Sin especificar',
        deptoLimpio: depto,
        promedioCalculado: obtenerPromedioAlumno(al)
    };
}

function coincideBusqueda(alNormalizado, textoBusqueda) {
    if (!textoBusqueda) return true;
    return (
        alNormalizado.nombreCompleto.toLowerCase().includes(textoBusqueda) ||
// Sin búsqueda por DNI
        alNormalizado.escuelaLimpia.toLowerCase().includes(textoBusqueda) ||
        alNormalizado.deptoLimpio.toLowerCase().includes(textoBusqueda)
    );
}


function ejecutarRenderizadoProcedencia() {
    const criterio = document.getElementById('select-agrupar-procedencia')?.value || 'escuela';
    const criterioOrden = document.getElementById('orden-tabla-instituciones')?.value || 'en_corte';
    const textoBusqueda = (document.getElementById('buscador-escuela-alumno')?.value || '').toLowerCase().trim();

    // 1. Normalizamos ambos universos (Total de inscriptos vs. Adentro del corte)
    const universoTotal = cachePadronCompleto.map(normalizarAlumno).filter(al => coincideBusqueda(al, textoBusqueda));
    const universoCorte = cacheAlumnosEnCorte.map(normalizarAlumno).filter(al => coincideBusqueda(al, textoBusqueda));

    // Actualizamos badges informativos
    const badgeCorte = document.getElementById('badge-resumen-corte');
    if (badgeCorte) badgeCorte.textContent = `${universoCorte.length} en corte / ${universoTotal.length} totales`;

    // 2. Contabilizamos por grupo (Escuela o Departamento)
    const mapaGrupos = {};

    // Primero contamos el TOTAL de inscriptos de cada escuela/departamento
    universoTotal.forEach(al => {
        const clave = criterio === 'escuela' ? al.escuelaLimpia : al.deptoLimpio;
        if (!mapaGrupos[clave]) {
            mapaGrupos[clave] = { nombre: clave, total: 0, enCorte: 0 };
        }
        mapaGrupos[clave].total++;
    });

    // Luego contamos cuántos de esos entraron en el CORTE actual
    universoCorte.forEach(al => {
        const clave = criterio === 'escuela' ? al.escuelaLimpia : al.deptoLimpio;
        if (!mapaGrupos[clave]) {
            mapaGrupos[clave] = { nombre: clave, total: 1, enCorte: 0 };
        }
        mapaGrupos[clave].enCorte++;
    });

    // Calculamos fuera del corte y % de efectividad
    const listaGrupos = Object.values(mapaGrupos).map(g => {
        const fueraCorte = Math.max(0, g.total - g.enCorte);
        const efectividad = g.total > 0 ? +((g.enCorte / g.total) * 100).toFixed(1) : 0;
        return {
            ...g,
            fueraCorte,
            efectividad
        };
    });

    // 3. Ordenamos la lista para la tabla derecha según lo que eligió el usuario
    const listaParaTabla = [...listaGrupos].sort((a, b) => {
        if (criterioOrden === 'efectividad') {
            // Desempata por mayor cantidad en corte
            return (b.efectividad - a.efectividad) || (b.enCorte - a.enCorte);
        }
        if (criterioOrden === 'total') {
            return (b.total - a.total) || (b.enCorte - a.enCorte);
        }
        // Por defecto ('en_corte'): prioriza los que metieron más alumnos en el corte
        return (b.enCorte - a.enCorte) || (b.total - a.total);
    });

    // Para el gráfico apilado tomamos el Top 10 de ese mismo orden
    const topParaGrafico = listaParaTabla.slice(0, LIMITE_TOP_GRAFICO);

    // 4. Ordenamos los alumnos individuales de mayor a menor promedio
    universoCorte.sort((a, b) => b.promedioCalculado - a.promedioCalculado);

    // 5. Renderizamos los 3 componentes
    renderizarGraficoApilado(topParaGrafico, criterio);
    renderizarTablaInstituciones(listaParaTabla, criterio);
    renderizarTablaAlumnosProcedencia(universoCorte);
}

function renderizarGraficoApilado(ranking, criterio) {
    const ctx = document.getElementById('canvas-procedencia-apilado');
    if (!ctx) return;

    const titulo = document.getElementById('titulo-grafico-apilado');
    if (titulo) {
        titulo.textContent = criterio === 'escuela'
            ? 'Top 10 Establecimientos (En Corte vs. Total)'
            : 'Departamentos (En Corte vs. Total)';
    }

    if (chartApilado) chartApilado.destroy();

    chartApilado = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranking.map(item => item.nombre.length > 28 ? item.nombre.substring(0, 28) + '...' : item.nombre),
            datasets: [
                {
                    label: 'En el Corte (Ingresan)',
                    data: ranking.map(item => item.enCorte),
                    backgroundColor: '#1b396a', // Azul institucional
                    borderRadius: 2
                },
                {
                    label: 'Fuera del Corte',
                    data: ranking.map(item => item.fueraCorte),
                    backgroundColor: '#dee2e6', // Gris suave para completar el total de la escuela
                    borderRadius: 2
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true, // 👈 Apila las barras horizontalmente
                    beginAtZero: true,
                    ticks: { precision: 0 }
                },
                y: {
                    stacked: true
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => ranking[items[0].dataIndex].nombre,
                        afterBody: (items) => {
                            const g = ranking[items[0].dataIndex];
                            return `Total escuela: ${g.total} | Efectividad: ${g.efectividad}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderizarTablaInstituciones(listaGrupos, criterio) {
    const tbody = document.getElementById('tbody-ranking-instituciones');
    const thNombre = document.getElementById('th-nombre-agrupacion');
    const titulo = document.getElementById('titulo-tabla-instituciones');

    if (thNombre) thNombre.textContent = criterio === 'escuela' ? 'Establecimiento' : 'Departamento';
    if (titulo) titulo.textContent = criterio === 'escuela' ? 'Efectividad por Establecimiento' : 'Efectividad por Departamento';
    if (!tbody) return;

    if (listaGrupos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted py-3">Sin datos para mostrar.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaGrupos.map((g, idx) => {
        // Color del badge según porcentaje de efectividad
        let colorBadge = 'bg-secondary';
        if (g.efectividad >= 70) colorBadge = 'bg-success';
        else if (g.efectividad >= 40) colorBadge = 'bg-primary';
        else if (g.efectividad > 0) colorBadge = 'bg-warning text-dark';

        return `
        <tr>
            <td class="text-muted fw-bold">${idx + 1}</td>
            <td class="text-start fw-semibold">${g.nombre}</td>
            <td class="fw-bold texto_azul_institucional">${g.enCorte}</td>
            <td class="text-muted">${g.total}</td>
            <td>
                <span class="badge ${colorBadge}" style="min-width: 55px;">${g.efectividad}%</span>
            </td>
        </tr>
        `;
    }).join('');
}

function renderizarTablaAlumnosProcedencia(alumnos) {
    const tbody = document.getElementById('tbody-procedencia-alumnos');
    const badgeTabla = document.getElementById('badge-cantidad-alumnos-tabla');
    if (badgeTabla) badgeTabla.textContent = `${alumnos.length} alumnos listados`;
    if (!tbody) return;

    if (alumnos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted py-3">No se encontraron alumnos con ese criterio.</td></tr>`;
        return;
    }

    tbody.innerHTML = alumnos.map((al, index) => {
        const ordenamiento = (index + 1);
        return `
        <tr>
            <td class="fw-bold text-secondary">#${ordenamiento}</td>
            <td class="text-start fw-semibold">${al.nombreCompleto}</td>
<!-- Sin columna DNI -->
            <td class="text-start">${al.escuelaLimpia}</td>
            <td><span class="badge bg-light text-dark border">${al.deptoLimpio}</span></td>
            <td class="fw-bold texto_azul_institucional">${al.promedioCalculado > 0 ? al.promedioCalculado.toFixed(2) : '-'}</td>
        </tr>
    `}).join('');
}




export function inicializarPanelFlotanteFiltros() {
    const panel = document.getElementById('panel-filtros-flotante');
    const header = document.getElementById('panel-filtros-header');
    const btnCerrar = document.getElementById('btn-cerrar-filtros');
    const btnAbrir = document.getElementById('btn-abrir-filtros-flotantes');
    const btnMinimizar = document.getElementById('btn-minimizar-filtros');
    const body = document.getElementById('panel-filtros-body');

    if (!panel || !header) return;

    // --- 1. DRAG & DROP ROBUSTO ---
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.onmousedown = (e) => {
        // Si hace clic en los botones de minimizar o cerrar, ignorar el arrastre
        if (e.target.closest('button')) return;

        isDragging = true;
        header.style.cursor = 'grabbing';

        const rect = panel.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        startX = e.clientX;
        startY = e.clientY;

        // Forzamos coordenadas fijas absolutas en píxeles para evitar saltos
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${initialLeft}px`;
        panel.style.top = `${initialTop}px`;

        document.onmousemove = (moveEvent) => {
            if (!isDragging) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            panel.style.left = `${initialLeft + dx}px`;
            panel.style.top = `${initialTop + dy}px`;
        };

        document.onmouseup = () => {
            isDragging = false;
            header.style.cursor = 'grab';
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    // --- 2. MINIMIZAR / MAXIMIZAR (Inicializa minimizado) ---
    let minimizado = true;
    if (body) body.style.display = 'none';
    if (btnMinimizar) btnMinimizar.innerHTML = '<i class="bi bi-plus-lg"></i>';
    panel.style.width = '230px';

    if (btnMinimizar && body) {
        btnMinimizar.onclick = (e) => {
            e.stopPropagation();
            minimizado = !minimizado;
            body.style.display = minimizado ? 'none' : 'block';
            btnMinimizar.innerHTML = minimizado ? '<i class="bi bi-plus-lg"></i>' : '<i class="bi bi-dash-lg"></i>';
            panel.style.width = minimizado ? '230px' : '340px';
        };
    }

    // --- 3. CERRAR Y REABRIR ---
    if (btnCerrar && btnAbrir) {
        btnCerrar.onclick = (e) => {
            e.stopPropagation();
            panel.style.display = 'none';
            btnAbrir.classList.remove('d-none');
            btnAbrir.classList.add('d-flex');
        };

        btnAbrir.onclick = () => {
            panel.style.display = 'block';
            btnAbrir.classList.remove('d-flex');
            btnAbrir.classList.add('d-none');
        };
    }
}







let chartEvolucionInstancia = null;
let datosGraficoCache = null; // Guardamos los promedios calculados para filtrar rápido con los botones

// Función auxiliar: calcula promedio válido (ignora nulos, NaN y ceros)
function calcularPromedioValido(notasArray) {
    const validas = notasArray
        .map(n => parseFloat(n))
        .filter(n => !isNaN(n) && n > 0);
    if (validas.length === 0) return null;
    return validas.reduce((acc, val) => acc + val, 0) / validas.length;
}

// Formateador visual de nota individual
function formatearNotaCelda(valor) {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) return '<span class="text-muted opacity-50">-</span>';
    return num.toFixed(2);
}

/**
 * Función Principal: Cruza los alumnos filtrados con estadoDashboard.cursillo
 * y actualiza KPIs, Gráfico Mixto y Tabla de 3 Etapas.
 */
export function actualizarPestanaExamenVsCursillo(alumnosFiltrados, datosCursillo = []) {
    // 1. Indexamos el cursillo en un Map por Nº de inscripción para búsqueda O(1)
    const mapaCursillo = new Map();
    if (Array.isArray(datosCursillo)) {
        datosCursillo.forEach(item => {
            const id = Number(item.nro_inscripcion);
            if (id > 0) mapaCursillo.set(id, item.cursillo);
        });
    }

    // Acumuladores para el gráfico de las 3 etapas
    const acum = {
        es: { mat: [], len: [], dib: [], prom: [] },
        ee: { mat: [], len: [], dib: [], prom: [] },
        of: { mat: [], len: [], dib: [], prom: [] }
    };

    // 2. Cruzamos cada alumno filtrado con sus notas de cursillo
    const alumnosCruzados = (alumnosFiltrados || []).map(alumno => {
        // Buscamos el Nº de inscripción/orden en las propiedades posibles de tu objeto alumno
        const nroInsc = Number(
            alumno['Nº de inscripción'] ||
            alumno['N° de inscripción'] ||
            alumno.nro_inscripcion ||
            alumno.id_inscripcion ||
            alumno['N° de orden'] ||
            alumno['Nº de orden'] ||
            0
        );

        const cursilloAlumno = mapaCursillo.get(nroInsc) || {};
        const es = cursilloAlumno.evaluacion_seguimiento || {};
        const ee = cursilloAlumno.ensayo_examen || {};
        const ex = alumno.datos_examen || {};

        // Notas Etapa 1: Evaluación de Seguimiento (E.S.)
        const esMat = parseFloat(es.matematica) > 0 ? parseFloat(es.matematica) : null;
        const esLen = parseFloat(es.lengua) > 0 ? parseFloat(es.lengua) : null;
        const esDib = parseFloat(es.dibujo) > 0 ? parseFloat(es.dibujo) : null;
        const promES = calcularPromedioValido([esMat, esLen, esDib]);

        // Notas Etapa 2: Ensayo de Examen (E.E.)
        const eeMat = parseFloat(ee.matematica) > 0 ? parseFloat(ee.matematica) : null;
        const eeLen = parseFloat(ee.lengua) > 0 ? parseFloat(ee.lengua) : null;
        const eeDib = parseFloat(ee.dibujo) > 0 ? parseFloat(ee.dibujo) : null;
        const promEE = calcularPromedioValido([eeMat, eeLen, eeDib]);

        // Notas Etapa 3: Examen Oficial
        const ofMat = ((alumno.datos_examen_oficial || ex).estado_matematica === "Presente" && parseFloat((alumno.datos_examen_oficial || ex).nota_final_matematica) > 0) ? parseFloat((alumno.datos_examen_oficial || ex).nota_final_matematica) : null;
        const ofLen = ((alumno.datos_examen_oficial || ex).estado_lengua === "Presente" && parseFloat((alumno.datos_examen_oficial || ex).nota_final_lengua) > 0) ? parseFloat((alumno.datos_examen_oficial || ex).nota_final_lengua) : null;
        const ofDib = ((alumno.datos_examen_oficial || ex).estado_dibujo === "Presente" && parseFloat((alumno.datos_examen_oficial || ex).nota_final_dibujo) > 0) ? parseFloat((alumno.datos_examen_oficial || ex).nota_final_dibujo) : null;
        const promOF = calcularPromedioValido([ofMat, ofLen, ofDib]);

        // Alimentamos acumuladores globales del recorte
        if (esMat) acum.es.mat.push(esMat);
        if (esLen) acum.es.len.push(esLen);
        if (esDib) acum.es.dib.push(esDib);
        if (promES) acum.es.prom.push(promES);

        if (eeMat) acum.ee.mat.push(eeMat);
        if (eeLen) acum.ee.len.push(eeLen);
        if (eeDib) acum.ee.dib.push(eeDib);
        if (promEE) acum.ee.prom.push(promEE);

        if (ofMat) acum.of.mat.push(ofMat);
        if (ofLen) acum.of.len.push(ofLen);
        if (ofDib) acum.of.dib.push(ofDib);
        if (promOF) acum.of.prom.push(promOF);

        return {
            ...alumno,
            nroInsc,
            etapas: {
                es: { mat: esMat, len: esLen, dib: esDib, prom: promES },
                ee: { mat: eeMat, len: eeLen, dib: eeDib, prom: promEE },
                of: { mat: ofMat, len: ofLen, dib: ofDib, prom: promOF }
            }
        };
    });

    // 3. Calculamos los promedios de cada etapa para el gráfico y los KPIs
    const avg = (arr) => arr.length > 0 ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;

    datosGraficoCache = {
        matematica: [avg(acum.es.mat), avg(acum.ee.mat), avg(acum.of.mat)],
        lengua: [avg(acum.es.len), avg(acum.ee.len), avg(acum.of.len)],
        dibujo: [avg(acum.es.dib), avg(acum.ee.dib), avg(acum.of.dib)],
        promedio: [avg(acum.es.prom), avg(acum.ee.prom), avg(acum.of.prom)]
    };

    // 4. Actualizamos las tarjetas superiores de KPIs de Evolución
    actualizarKpisEvolucion(datosGraficoCache.promedio);

    // 5. Renderizamos el Gráfico y la Tabla
    renderizarGraficoEvolucion(datosGraficoCache, obtenerFiltroAreaActivo());
    renderizarTablaEvolucion(alumnosCruzados);
}

// Actualiza los 4 Mini-KPIs superiores de la pestaña
function actualizarKpisEvolucion([promES, promEE, promOF]) {
    const elES = document.getElementById('kpi-evo-es');
    const elEE = document.getElementById('kpi-evo-ee');
    const elOF = document.getElementById('kpi-evo-oficial');
    const elDif = document.getElementById('kpi-evo-diferencia');

    if (elES) elES.innerText = promES > 0 ? promES.toFixed(2) : '-';
    if (elEE) elEE.innerText = promEE > 0 ? promEE.toFixed(2) : '-';
    if (elOF) elOF.innerText = promOF > 0 ? promOF.toFixed(2) : '-';

    if (elDif) {
        const baseInicial = promES > 0 ? promES : promEE;
        if (baseInicial > 0 && promOF > 0) {
            const diff = promOF - baseInicial;
            const signo = diff > 0 ? '+' : '';
            const colorClase = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-secondary');
            const icono = diff > 0 ? '▲' : (diff < 0 ? '▼' : '•');
            elDif.className = `fw-bold mb-0 ${colorClase}`;
            elDif.innerText = `${icono} ${signo}${diff.toFixed(2)}`;
        } else {
            elDif.className = 'fw-bold mb-0 text-muted';
            elDif.innerText = '-';
        }
    }
}

// Renderiza el gráfico mixto (Barras de Áreas + Línea Transversal de Promedio)
function renderizarGraficoEvolucion(datos, filtroArea = 'todas') {
    const ctx = document.getElementById('grafico-evolucion-etapas');
    if (!ctx) return;

    if (chartEvolucionInstancia) {
        chartEvolucionInstancia.destroy();
    }

    const etiquetasEtapas = [
        '1º Eval. Seguimiento (E.S.)',
        '2º Ensayo de Examen (E.E.)',
        '3º Examen de Ingreso Oficial'
    ];

    const mostrarMat = filtroArea === 'todas' || filtroArea === 'matematica';
    const mostrarLen = filtroArea === 'todas' || filtroArea === 'lengua';
    const mostrarDib = filtroArea === 'todas' || filtroArea === 'dibujo';
    const mostrarProm = filtroArea === 'todas' || filtroArea === 'promedio';

    const datasets = [];

    // Línea transversal (la agregamos con order: 0 para que se dibuje por encima de las barras)
    if (mostrarProm) {
        datasets.push({
            type: 'line',
            label: 'Promedio General de la Etapa',
            data: datos.promedio,
            borderColor: '#ffc107',
            backgroundColor: '#ffc107',
            borderWidth: 3,
            pointBackgroundColor: '#212529',
            pointBorderColor: '#ffc107',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.25,
            order: 0
        });
    }

    if (mostrarMat) {
        datasets.push({
            type: 'bar',
            label: 'Matemática',
            data: datos.matematica,
            backgroundColor: 'rgba(172, 26, 33, 0.88)', // Bordó institucional
            borderColor: '#ac1a21',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 55,
            order: 1
        });
    }

    if (mostrarLen) {
        datasets.push({
            type: 'bar',
            label: 'Lengua',
            data: datos.lengua,
            backgroundColor: 'rgba(27, 57, 106, 0.88)', // Azul institucional
            borderColor: '#1b396a',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 55,
            order: 1
        });
    }

    if (mostrarDib) {
        datasets.push({
            type: 'bar',
            label: 'Dibujo',
            data: datos.dibujo,
            backgroundColor: 'rgba(73, 80, 87, 0.88)', // Gris institucional
            borderColor: '#495057',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 55,
            order: 1
        });
    }

    chartEvolucionInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetasEtapas,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.dataset.label}: ${Number(context.raw).toFixed(2)} pts`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: { display: true, text: 'Calificación Promedio (Escala 0 - 10)' }
                }
            }
        }
    });
}

// Renderiza la tabla comparativa agrupada por etapas
function renderizarTablaEvolucion(alumnosCruzados) {
    const tbody = document.getElementById('tbody-evolucion-cursillo');
    if (!tbody) return;

    if (!alumnosCruzados || alumnosCruzados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" class="text-center text-muted py-4">
                    No hay alumnos que coincidan con el filtro global actual.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = alumnosCruzados.map(a => {
        const apellido = a['Apellido/s del alumno'] || '';
        const nombre = a['Nombre/s del alumno'] || '';
        const comision = a['Comisión'] || a['Comision'] || a.comision || '-';
        const { es, ee, of } = a.etapas;

        // Cálculo de evolución individual (Compara Examen Oficial contra la primera etapa disponible del cursillo)
        const baseCursillo = es.prom !== null ? es.prom : ee.prom;
        let badgeEvolucion = '<span class="text-muted small">-</span>';

        if (baseCursillo !== null && of.prom !== null) {
            const delta = of.prom - baseCursillo;
            if (delta > 0.1) {
                badgeEvolucion = `<span class="badge bg-success-subtle text-success border border-success-subtle">▲ +${delta.toFixed(2)}</span>`;
            } else if (delta < -0.1) {
                badgeEvolucion = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle">▼ ${delta.toFixed(2)}</span>`;
            } else {
                badgeEvolucion = `<span class="badge bg-secondary-subtle text-secondary border">= ${delta.toFixed(2)}</span>`;
            }
        }

        return `
            <tr>
                <td class="fw-bold text-secondary">${a.ordenMerito || '-'}</td>
                <td class="text-start">
                    <div class="fw-semibold text-dark">${apellido}, ${nombre}</div>
                    <small class="text-muted" style="font-size: 0.7rem;">Insc. #${a.nroInsc || '-'}</small>
                </td>
                <td><span class="badge bg-light text-dark border">${comision}</span></td>

                <!-- ETAPA 1: E.S. -->
                <td class="border-start border-2">${formatearNotaCelda(es.mat)}</td>
                <td>${formatearNotaCelda(es.len)}</td>
                <td>${formatearNotaCelda(es.dib)}</td>
                <td class="bg-light fw-bold text-secondary">${es.prom !== null ? es.prom.toFixed(2) : '-'}</td>

                <!-- ETAPA 2: E.E. -->
                <td class="border-start border-2">${formatearNotaCelda(ee.mat)}</td>
                <td>${formatearNotaCelda(ee.len)}</td>
                <td>${formatearNotaCelda(ee.dib)}</td>
                <td class="bg-light fw-bold text-primary">${ee.prom !== null ? ee.prom.toFixed(2) : '-'}</td>

                <!-- ETAPA 3: OFICIAL -->
                <td class="border-start border-2">${formatearNotaCelda(of.mat)}</td>
                <td>${formatearNotaCelda(of.len)}</td>
                <td>${formatearNotaCelda(of.dib)}</td>
                <td class="bg-light fw-bold" style="color: #1b396a;">${of.prom !== null ? of.prom.toFixed(2) : '-'}</td>

                <!-- TENDENCIA / EVOLUCIÓN -->
                <td class="border-start border-2">${badgeEvolucion}</td>
            </tr>
        `;
    }).join('');
}

// Helper para leer qué botón de filtro del gráfico está activo
function obtenerFiltroAreaActivo() {
    const btnActivo = document.querySelector('#grupo-filtros-grafico-evo button.active');
    return btnActivo ? btnActivo.getAttribute('data-filtro-area') : 'todas';
}

// Inicializador de los botones de filtro del gráfico (llamar 1 sola vez al cargar el DOM)
export function inicializarEventosExamenVsCursillo() {
    const contenedorBotones = document.getElementById('grupo-filtros-grafico-evo');
    if (!contenedorBotones) return;

    contenedorBotones.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-filtro-area]');
        if (!btn) return;

        // Actualizamos estado activo de los botones
        contenedorBotones.querySelectorAll('button').forEach(b => {
            b.classList.remove('active', 'btn-dark');
            if (!b.className.includes('btn-outline-')) {
                b.classList.add('btn-outline-dark');
            }
        });
        btn.classList.add('active');

        const filtro = btn.getAttribute('data-filtro-area');
        if (datosGraficoCache) {
            renderizarGraficoEvolucion(datosGraficoCache, filtro);
        }
    });
}