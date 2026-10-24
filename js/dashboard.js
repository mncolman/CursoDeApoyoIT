import * as Api from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';
import * as UImetrics from './ui-metricas.js';
import * as Filtros from './filters.js';
import * as Utils from './utils.js';


// Importamos el estado y la función
import { EstadoDashboard, cargarDatosEstadisticos } from './api.js';

// Constantes de colores institucionales unificadas para todos los gráficos
const COLOR_MATEMATICA = { borde: 'rgb(172, 26, 33)', fondo: 'rgba(172, 26, 33, 0.52)' };
const COLOR_LENGUA = { borde: 'rgb(27, 57, 106)', fondo: 'rgba(27, 57, 106, 0.45)' };
const COLOR_DIBUJO = { borde: 'rgb(73, 80, 87)', fondo: 'rgba(73, 80, 87, 0.45)' };

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Guardia de seguridad en el cliente y configuración de barra superior
    if (!verificarAccesoDirectivo()) return;

    UImetrics.inicializarPanelFlotanteFiltros();
    UImetrics.inicializarEventosExamenVsCursillo();

    // =================================================================
    // 2. LISTENERS DE FILTROS EN TIEMPO REAL
    // =================================================================

    document.getElementById('filtro-etapa-evaluacion')?.addEventListener('change', () => {
        actualizarDashboardFiltrado();
    });

    document.getElementById('filtro-merito-min')?.addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    document.getElementById('filtro-merito-max')?.addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    // Escuchamos el buscador de texto en tiempo real
    document.getElementById('buscador-escuela-alumno')?.addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    // =================================================================
    // 3. DISPARADORES DE CARGA (Sin tareas duplicadas)
    // =================================================================

    // Opción A: Botón "Actualizar" (Fuerza la descarga de datos nuevos)
    document.getElementById('btn-actualizar-graficos')?.addEventListener('click', async () => {
        const exito = await cargarDatosEstadisticos();
        if (exito) {
            inicializarYRenderizarDashboard();
        }
    });

    // Listener para el selector de orden de la tabla docente
    document.getElementById('select-ordenar-docentes-tabla')?.addEventListener('change', () => {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos, EstadoDashboard.cursillo);
        UImetrics.renderizarTablaDocentes(alumnosFiltrados);
    });

    document.getElementById('select-filtro-comision')?.addEventListener('change', (e) => {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos, EstadoDashboard.cursillo);
        UImetrics.renderizarGraficoComisiones(alumnosFiltrados, e.target.value);
    });

    // 2. Escuchamos el cambio de píldora (General / Matemática / Lengua / Dibujo)
    document.querySelectorAll('input[name="btn-distribucion"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos, EstadoDashboard.cursillo);
            UImetrics.renderizarGraficoDistribucion(alumnosFiltrados, e.target.value);
        });
    });

    // Escuchamos el cambio en el selector de orden de comisiones
    document.getElementById('select-ordenar-comisiones')?.addEventListener('change', () => {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos, EstadoDashboard.cursillo);
        UImetrics.renderizarTablaComisiones(alumnosFiltrados);
    });

    // Carga automática al abrir dashboard.html
    const sinDatos = !EstadoDashboard.alumnos || EstadoDashboard.alumnos.length === 0;
    if (sinDatos) {
        const exito = await cargarDatosEstadisticos();
        if (exito) {
            inicializarYRenderizarDashboard();
        }
    } else {
        inicializarYRenderizarDashboard();
    }
});


function inicializarYRenderizarDashboard() {
    UImetrics.inicializarFiltrosMerito();
    UImetrics.inicializarSelectorComisiones(EstadoDashboard.alumnos);
    actualizarDashboardFiltrado();
}


// Actualización integral reactiva a Etapa + Rango de Mérito + Buscador
function actualizarDashboardFiltrado() {
    const etapaActiva = Filtros.obtenerEtapaSeleccionada();

    // 1. Proyectamos todo el padrón a la etapa seleccionada para KPIs Globales y padrón de Alumnos
    const padronProyectadoEtapa = Filtros.proyectarAlumnosPorEtapa(
        EstadoDashboard.alumnos,
        EstadoDashboard.cursillo,
        etapaActiva
    );

    // 2. Obtenemos el recorte filtrado y ordenado por mérito de la etapa activa
    const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(
        EstadoDashboard.alumnos,
        EstadoDashboard.cursillo
    );

    // 3. KPIs Globales (Fila 1 y 2 de Resumen) y Tabla de Orden de Mérito
    UImetrics.calcularKpisGlobales(padronProyectadoEtapa);
    UImetrics.renderizarTablaMerito(alumnosFiltrados);
    UImetrics.calcularMiniKpisFiltrados(alumnosFiltrados);

    // 4. Sub-pestaña Exámenes: Mostrar/ocultar radares de incisos según si es Examen Oficial o Cursillo
    const contenedorRadares = document.getElementById('contenedor-radares');
    const avisoIncisos = document.getElementById('aviso-incisos-solo-oficial');

    if (etapaActiva === 'oficial') {
        if (contenedorRadares) contenedorRadares.classList.remove('d-none');
        if (avisoIncisos) {
            avisoIncisos.classList.add('d-none');
            avisoIncisos.classList.remove('d-flex');
        }
        UImetrics.renderizarRadarDinamico('matematica', 'radarMatematica', COLOR_MATEMATICA.borde, COLOR_MATEMATICA.fondo, alumnosFiltrados);
        UImetrics.renderizarRadarDinamico('lengua', 'radarLengua', COLOR_LENGUA.borde, COLOR_LENGUA.fondo, alumnosFiltrados);
        UImetrics.renderizarRadarDinamico('dibujo', 'radarDibujo', COLOR_DIBUJO.borde, COLOR_DIBUJO.fondo, alumnosFiltrados);
    } else {
        // En etapas del cursillo no hay desglose por incisos: ocultamos los 3 radares y mostramos el aviso institucional
        if (contenedorRadares) contenedorRadares.classList.add('d-none');
        if (avisoIncisos) {
            avisoIncisos.classList.remove('d-none');
            avisoIncisos.classList.add('d-flex');
        }
    }

    // Histograma de distribución de notas (funciona en las 3 etapas)
    UImetrics.renderizarGraficoDistribucion(alumnosFiltrados);
    UImetrics.actualizarRankingContenidos(alumnosFiltrados, EstadoDashboard.examenes);

    // 5. Sub-pestaña Comisiones
    const comisionSeleccionada = document.getElementById('select-filtro-comision')?.value || 'todas';
    UImetrics.renderizarGraficoComisiones(alumnosFiltrados, comisionSeleccionada);
    UImetrics.renderizarTablaComisiones(alumnosFiltrados);

    // 6. Sub-pestaña Docentes
    UImetrics.renderizarRadarsDocentes(alumnosFiltrados);
    UImetrics.renderizarTablaDocentes(alumnosFiltrados);

    // 7. Sub-pestaña Alumnos (Procedencia)
    UImetrics.actualizarPestanaAlumnos(alumnosFiltrados, padronProyectadoEtapa);

    // 8. Sub-pestaña Examen vs Cursillo (siempre compara las 3 etapas ignorando el selector de etapa individual)
    UImetrics.actualizarPestanaExamenVsCursillo(alumnosFiltrados, EstadoDashboard.cursillo);
}


function verificarAccesoDirectivo() {
    const sesion = Auth.verificarSesionPrevia();
    if (!sesion.activa) {
        // Si no hay sesión activa en sessionStorage, rebota al login principal
        window.location.href = '../index.html';
        return false;
    }

    const usuario = sesion.usuario || {};
    const rol = (usuario.rol || '').toUpperCase();

    // Verificar si el rol tiene permiso para ver este dashboard
    if (rol !== 'ADMI' && rol !== 'COOR' && rol !== 'DIRECTIVO' && rol !== 'ADMIN') {
        alert('Acceso no autorizado.');
        console.warn("Rol sin permiso para métricas:", usuario.rol);
        window.location.href = '../index.html';
        return false;
    }

    // Mostrar usuario en navbar y conectar botón de cerrar sesión
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = `${usuario.nombre || 'Usuario'} (${usuario.rol})`;
    }

    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            sessionStorage.clear();
            localStorage.removeItem('token_sesion');
            window.location.href = '../index.html';
        });
    }

    return true;
}
