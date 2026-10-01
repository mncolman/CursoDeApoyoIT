import { EstadoDashboard } from './api.js';
import * as Utils from './utils.js';


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
                    pointRadius: 2,
                    pointHoverRadius: 3,
                    pointBackgroundColor: 'rgba(108, 117, 125, 0.5)',
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
                        color: '#6c757d'
                    },
                    pointLabels: {
                        font: { size: 11, weight: 'bold' },
                        color: '#343a40'
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
// 2. MINI-KPIS FILTRADOS (Se recalculan en tiempo real al filtrar)
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
    const promedios = alumnosFiltrados.map(a => a.promedioGeneral);
    const promGrupo = (promedios.reduce((acc, v) => acc + v, 0) / promedios.length).toFixed(2);
    const maxGrupo = Math.max(...promedios).toFixed(2);
    const minGrupo = Math.min(...promedios).toFixed(2);

    if (elProm) elProm.innerText = promGrupo;
    if (elMax) elMax.innerText = maxGrupo;
    if (elMin) elMin.innerText = minGrupo;

    // Promedios por materia dentro del recorte
    const promPorMateria = (materia) => {
        const pres = alumnosFiltrados.filter(a => a.datos_examen?.[`estado_${materia}`] === "Presente");
        if (pres.length === 0) return '-';
        const sum = pres.reduce((acc, a) => acc + a.datos_examen[`nota_final_${materia}`], 0);
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
        const nombreCompleto = alumno['Apellido/s del alumno'] + ', ' + alumno['Nombre/s del alumno'] || alumno['Nombre y Apellido'] || alumno['Alumno'] || 'Sin Nombre';

        const comision = alumno['Comisión'] || alumno['Comision'] || alumno['comision'] || '-';

        // Promedio: si es 0 muestra "Ausente"
        const celdaPromedio = alumno.promedioGeneral > 0
            ? `<span class="fw-bold text-primary">${alumno.promedioGeneral.toFixed(3)}</span>`
            : `<span class="badge bg-secondary-subtle text-secondary">Ausente</span>`;

        htmlFilas += `
            <tr>
                <td class="text-center">${puestoBadge}</td>
                <td class="fw-semibold">${nombreCompleto}</td>
                <td class="text-center font-monospace small bold">${comision}</td>
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
        general: { borde: 'rgb(13, 110, 253)', fondo: 'rgba(13, 110, 253, 0.45)' },
        matematica: { borde: 'rgb(138, 0, 0)', fondo: 'rgba(235, 54, 54, 0.45)' },
        lengua: { borde: 'rgb(4, 19, 87)', fondo: 'rgba(75, 77, 192, 0.45)' },
        dibujo: { borde: 'rgb(75, 85, 99)', fondo: 'rgba(108, 117, 125, 0.45)' }
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






// =================================================================
// 1. LLENAR EL SELECTOR DE COMISIONES AUTOMÁTICAMENTE
// =================================================================
export function inicializarSelectorComisiones(alumnos) {
    const select = document.getElementById('select-filtro-comision');
    if (!select) return;

    // Extraemos las comisiones únicas y las ordenamos
    const comisionesSet = new Set();
    alumnos.forEach(a => {
        if (a['Comision'] !== undefined && a['Comision'] !== null && a['Comision'] !== '') {
            comisionesSet.add(String(a['Comision']));
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
            const com = String(a['Comision'] ?? 'Sin Comisión');
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
                        backgroundColor: 'rgba(235, 54, 54, 0.6)',
                        borderColor: 'rgb(138, 0, 0)',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Lengua',
                        data: datosLen,
                        backgroundColor: 'rgba(75, 77, 192, 0.6)',
                        borderColor: 'rgb(4, 19, 87)',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Dibujo',
                        data: datosDib,
                        backgroundColor: 'rgba(108, 117, 125, 0.6)',
                        borderColor: 'rgb(50, 50, 50)',
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
    const alumnosComision = alumnos.filter(a => String(a['Comision']) === comisionSeleccionada);

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
                    backgroundColor: 'rgba(13, 110, 253, 0.65)',
                    borderColor: 'rgb(13, 110, 253)',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    maxBarThickness: 60
                },
                {
                    label: 'Media General (Academia)',
                    data: [promMatGen.toFixed(2), promLenGen.toFixed(2), promDibGen.toFixed(2)],
                    backgroundColor: 'rgba(108, 117, 125, 0.3)',
                    borderColor: 'rgb(108, 117, 125)',
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
        const com = String(a['Comisión'] ?? a['Comision'] ?? 'Sin Comisión');
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
        const promAlumno = Utils.obtenerPromedioAlumno(a);

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