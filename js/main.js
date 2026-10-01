import * as Api from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';
import * as UImetrics from './ui-metricas.js';
import * as Filtros from './filters.js';
import * as Utils from './utils.js';


// Importamos el estado y la función
import { EstadoDashboard, cargarDatosEstadisticos } from './api.js';


// Constantes de colores para los gráficos
const COLOR_MATEMATICA = { borde: 'rgb(138, 0, 0)', fondo: 'rgba(235, 54, 54, 0.4)' };
const COLOR_LENGUA = { borde: 'rgb(4, 19, 87)', fondo: 'rgba(75, 77, 192, 0.4)' };
const COLOR_DIBUJO = { borde: 'rgb(50, 50, 50)', fondo: 'rgba(219, 200, 145, 0.4)' };


// --- 1. ESTADO GLOBAL Y CACHÉ ---

let aspirantesGlobales = [];
let eventosGlobales = [];
let permisosDocentes = [];
let usuarioActual = null;
let isExpandedView = false;




// =================================================================
// 2. funcion puente para invocar filtros
// =================================================================
function orquestarFiltros() {
    const searchRaw = document.getElementById('searchInput').value.toLowerCase();
    const search = searchRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const comision = document.getElementById('filterComision').value;
    const sortMethod = document.getElementById('sortSelect').value;
    const turno = document.getElementById('turnoSelect').value;

    const listaFiltrada = Filtros.filtrarYOrdenar(aspirantesGlobales, search, String(comision), sortMethod, turno);

    UI.actualizarMiniReporte(listaFiltrada);
    UI.renderTable(listaFiltrada, isExpandedView);

    return listaFiltrada;
}






// =================================================================
// 2. INICIALIZACIÓN (Cuando carga la página)
// =================================================================
document.addEventListener('DOMContentLoaded', function () {

    // 1. Buscamos el select usando el ID real que me acabas de mostrar
    const selectSemana = document.getElementById('filtro-semana-cronograma');

    // 2. Escuchamos el cambio manual del select
    if (selectSemana) {
        selectSemana.addEventListener('change', () => {
            UI.renderizarTablaCronograma(eventosGlobales, selectSemana.value);
        });
    }

    // 3. Cuando el usuario entra a la pestaña, forzamos el redibujado
    // (Asegurate de que 'tab-cronograma' sea el ID de tu botón/enlace de la pestaña)
    const botonPestanaCronograma = document.getElementById('tab-cronograma');
    if (botonPestanaCronograma) {
        botonPestanaCronograma.addEventListener('shown.bs.tab', () => {
            if (eventosGlobales && eventosGlobales.length > 0 && selectSemana) {
                UI.renderizarTablaCronograma(eventosGlobales, selectSemana.value);
            }
        });
    }







    document.getElementById('btnDescargarSalud').addEventListener('click', () => {
        // Si ya tenés la lista filtrada guardada en memoria, se la pasás directo
        const alumnosConSalud = aspirantesGlobales.filter(a => (a.enfermedad).trim() !== '');
        Utils.descargarPlanillaSaludPDF(alumnosConSalud);
    });


    const turnoSelect = document.getElementById('turnoSelect');
    if (turnoSelect) {
        turnoSelect.addEventListener('change', orquestarFiltros);
    }

    // --- 1. VERIFICACIÓN Y ORQUESTACIÓN DE SESIÓN ---
const sesion = Auth.verificarSesionPrevia();

if (sesion.activa) {
    console.log("Sesión activa recuperada de sessionStorage");

    // 1. Restaurar variables globales en main.js
    usuarioActual = sesion.usuario;
    aspirantesGlobales = sesion.aspirantes;
    eventosGlobales = sesion.eventos; 
    
    // CORRECCIÓN: En auth.js lo retorna como 'permisosGuardados', no 'permisos_docente'
    permisosDocentes = sesion.permisosGuardados || []; 

    // 2. Configurar la vista según el rol del usuario
    UI.configurarInterfazPorRol(usuarioActual);

    // 3. Renderizar Dashboard si corresponde
    if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
        UI.renderizarDashboardGeneral(aspirantesGlobales);
    }

    // 4. Inicializar selects y módulos
    UI.inicializarFiltroComisiones(aspirantesGlobales);
    UI.inicializarModuloNotas(aspirantesGlobales, permisosDocentes);
    
    // 5. 🔹 INICIALIZAMOS EL CALENDARIO Y CRONOGRAMA
    // Acá estaba faltando pasarle los eventos al FullCalendar
    UI.inicializarCalendario(eventosGlobales); 
    
    // Llamamos al render del cronograma por si tu función lo requiere de entrada
    UI.renderizarTablaCronograma(eventosGlobales); 

    // 6. Aplicar filtros cruzados (gráficos y tablas)
    orquestarFiltros();

    // 7. Forzar el dibujado de la semana 3 en el cronograma
    const selectSemana = document.getElementById('filtro-semana-cronograma');
    if (selectSemana) {
        selectSemana.value = "3";
        // Disparamos el evento para que la tabla se dibuje filtrada
        selectSemana.dispatchEvent(new Event('change'));
    }

} else {
    // Si la sesión no existe o expiró
    
    // 1. Limpiamos cualquier basura o rastro previo en memoria
    sessionStorage.clear();

    // 2. Nos aseguramos de que el usuario vea SOLO la pantalla de login
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    
    if (loginContainer) loginContainer.classList.remove('d-none');
    if (appContainer) appContainer.classList.add('d-none');
}



    // --- 2. EVENT LISTENERS GENERALES ---




    /*
    // =================================================================
    // TOGGLE VISIBILIDAD DE CONTRASEÑA (Protegido con DOMContentLoaded)
    // =================================================================
    document.addEventListener('DOMContentLoaded', () => {
        
        const btnVerClave = document.getElementById('btnVerClave');
        
        // Verificamos que el botón realmente exista en esta página
        if (btnVerClave) {
            btnVerClave.addEventListener('click', function (e) {
                
                // Escudo anti-celulares: evita que el input pierda el foco
                e.preventDefault(); 
                
                const inputClave = document.getElementById('loginClave');
                const iconoOjo = document.getElementById('iconoOjo');
                
                if (inputClave.type === 'password') {
                    inputClave.type = 'text';
                    iconoOjo.innerHTML = `
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l-.708-.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                    `;
                } else {
                    inputClave.type = 'password';
                    iconoOjo.innerHTML = `
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    `;
                }
            });
        }
    });*/



    // inicio y cierre de sesion
    document.getElementById('loginForm').addEventListener('submit', iniciarSesion); // (O Auth.iniciarSesion si la moviste)
    document.getElementById('btnCerrarSesion').addEventListener('click', Auth.cerrarSesionLocal);

    // Buscador y Filtros
    document.getElementById('searchInput').addEventListener('input', orquestarFiltros);
    document.getElementById('filterComision').addEventListener('change', orquestarFiltros);
    document.getElementById('sortSelect').addEventListener('change', orquestarFiltros);

    // Toggle de Vista Expandida en la Tabla
    document.getElementById('viewToggle').addEventListener('change', function (e) {
        isExpandedView = e.target.checked;
        orquestarFiltros();
    });

    // Cierra el menú hamburguesa al hacer clic en una pestaña (solo en móviles)
    const navLinks = document.querySelectorAll('#collapsibleTabs .nav-link');
    const menuCollapse = document.getElementById('collapsibleTabs');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 992) { // 992px es el breakpoint 'lg' de Bootstrap
                const bsCollapse = bootstrap.Collapse.getInstance(menuCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                }
            }
        });
    });


    //  NUEVO: EL GUARDIÁN DE LA TABLA (Delegación)
    const tbody = document.getElementById('tabla-aspirantes-body');

    tbody.addEventListener('click', (e) => {
        const botonClickeado = e.target.closest('.btn-abrir-ficha');

        if (botonClickeado) {
            const id = botonClickeado.dataset.id; // Rescatamos el valor oculto

            // Llamamos a la función de UI que abre el modal
            UI.abrirFicha(aspirantesGlobales, id);
        }
    });

    // Listener del boton descargar listado como pdf




    // Función centralizada para preparar los datos antes de imprimir
    async function prepararYDescargar(tipoDescarga) {
        const comisionSeleccionada = document.getElementById("filterComision").value;

        if (!aspirantesGlobales || aspirantesGlobales.length === 0) {
            Swal.fire('Error', 'No hay alumnos cargados en memoria.', 'error');
            return;
        }

        let alumnosAProcesar = orquestarFiltros();

        /*
        // Verificamos si seleccionó "Todas" (valor vacío)
        if (comisionSeleccionada === "") {

            // Avisamos al usuario que esto va a demorar un poquito
            Swal.fire({
                title: 'Generando lotes...',
                text: 'Se descargarán 10 archivos consecutivos. Por favor, permití las descargas múltiples si el navegador te lo pide.',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false
            });

            // Esperamos 3 segundos para que lea el mensaje antes de arrancar
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Bucle del 1 al 10
            for (let i = 1; i <= 10; i++) {
                // Llamamos a la función maestra forzando la comisión actual (i)
                Utils.descargarPlanillaPDF(alumnosAProcesar, String(i), tipoDescarga);

                // Ponemos una pausa de 1.5 segundos entre cada descarga
                // para que el navegador no bloquee las descargas masivas y no se rompa el SweetAlert
                await new Promise(resolve => setTimeout(resolve, 1500));
            } 
            Swal.fire('¡Listo!', 'Se descargaron las 10 planillas.', 'success');
                
            */

        // Modo normal: descarga solo la comisión que eligió
        Utils.descargarPlanillaPDF(alumnosAProcesar, comisionSeleccionada, tipoDescarga);

    }

    // Escuchadores de los 4 botones del modal
    document.getElementById('btnDescargarAlumnos').addEventListener('click', () => prepararYDescargar('alumnos'));
    document.getElementById('btnDescargarAsistenciaSemanal').addEventListener('click', () => prepararYDescargar('semanal'));
    document.getElementById('btnDescargarAsistenciaMensual').addEventListener('click', () => prepararYDescargar('mensual'));
    document.getElementById('btnDescargarPlanillaObservaciones').addEventListener('click', () => prepararYDescargar('observaciones'));


    document.getElementById('btnCronogramaMatematicas').addEventListener('click', () => Utils.descargarPlanillaCronograma(eventosGlobales, 'Matematica'));
    document.getElementById('btnCronogramaDibujo').addEventListener('click', () => Utils.descargarPlanillaCronograma(eventosGlobales, 'Dibujo'));
    document.getElementById('btnCronogramaLengua').addEventListener('click', () => Utils.descargarPlanillaCronograma(eventosGlobales, 'Lengua'));


    const btnDescargarCronogramaSemana = document.getElementById('btnDescargarCronogramaSemanal');
    if (btnDescargarCronogramaSemana) {
        btnDescargarCronogramaSemana.addEventListener('click', () => {
            // Asegurate de importar descargarCronogramaSemanal si está en otro archivo
            Utils.descargarCronogramaSemanal(eventosGlobales);
        });
    }



    // =================================================================
    // ACTUALIZAR TEXTO DEL MODAL DE DESCARGAS ANTES DE ABRIRSE
    // =================================================================
    const modalDescargas = document.getElementById('modalOpcionesDescarga');

    if (modalDescargas) {
        modalDescargas.addEventListener('show.bs.modal', () => {
            // 1. Leemos qué comisión está seleccionada en el filtro principal
            const comisionSeleccionada = document.getElementById("filterComision").value;

            // 2. Apuntamos al párrafo que creaste en el modal
            const textoComision = document.getElementById("comision-seleccionada-modal");

            // 3. Modificamos el texto dinámicamente
            if (comisionSeleccionada === "") {
                textoComision.innerHTML = `<strong>Comisión seleccionada:</strong> Todas`;
            } else {
                textoComision.innerHTML = `<strong>Comisión seleccionada:</strong> ${comisionSeleccionada}`;
            }
        });
    }



    // 1. Clic en el Ojito del Dashboard
    document.getElementById('btnVerListaSalud').addEventListener('click', () => {

        // A. Filtramos la lista global (asumimos enfermedad distinta de vacío)
        // Agregamos trim() para ignorar celdas que solo tengan espacios
        const alumnosConSalud = aspirantesGlobales.filter(a => a.enfermedad && a.enfermedad.trim() !== "");

        // B. Mandamos a dibujar al UI
        UI.renderModalSalud(alumnosConSalud);

        // C. Mostramos el modal usando Bootstrap
        const modal = new bootstrap.Modal(document.getElementById('modalListaSalud'));
        modal.show();
    });


    // ===============================================================
    // 👉 REVISIÓN DE LA LÓGICA DE DELEGACIÓN PARA ABRIR FICHA
    // ===============================================================

    // Función genérica e INTELIGENTE para manejar el clic
    const manejarClicFicha = (e) => {
        const botonClickeado = e.target.closest('.btn-abrir-ficha');

        if (!botonClickeado) return; // Si no es el botón, no hacemos nada

        const id = botonClickeado.dataset.id;

        // 👉 NUEVO: Detectar si el botón está DENTRO del modal de salud
        const modalSaludForm = botonClickeado.closest('#modalListaSalud');

        if (modalSaludForm) {
            // ESCENARIO A: Clic DESDE la lista de salud

            // 1. Obtenemos la instancia de Bootstrap del modal de salud
            const bsModalSalud = bootstrap.Modal.getInstance(modalSaludForm);

            if (bsModalSalud) {
                // 2. Escuchamos el evento 'hidden.bs.modal' (cuando termina de ocultarse)
                // Usamos una función anónima para que se ejecute UNA sola vez
                modalSaludForm.addEventListener('hidden.bs.modal', function handler() {
                    // 3. Ahora que el primer modal cerró completamente, abrimos la ficha
                    UI.abrirFicha(aspirantesGlobales, id);

                    // Importante: removemos el listener para que no se acumule
                    modalSaludForm.removeEventListener('hidden.bs.modal', handler);
                });

                // 4. Mandamos a cerrar el modal de salud
                bsModalSalud.hide();
            }
        } else {
            // ESCENARIO B: Clic DESDE la tabla principal (comportamiento normal)
            UI.abrirFicha(id);
        }
    };

    // 1. Delegador Tabla Principal (el que ya tenías)
    const tbodyPrincipal = document.getElementById('tbodyPrincipal'); // Asegurate del ID
    if (tbodyPrincipal) tbodyPrincipal.addEventListener('click', manejarClicFicha);

    // 2. NUEVO: Delegador para el Modal de Salud
    const tbodySalud = document.getElementById('tbodySalud');
    if (tbodySalud) tbodySalud.addEventListener('click', manejarClicFicha);



    document.getElementById('btnGuardarNotas').addEventListener('click', async () => {

        const tokenActual = sessionStorage.getItem('sesion_activa');
        const comisionActual = document.getElementById('inputComisionActual').value;
        const materiaActual = document.getElementById('inputMateriaActual').value;
        const instanciaActual = document.getElementById('selectInstanciaEvaluacion').value;

        const inputsDeNotas = document.querySelectorAll('.input-nota');
        const arrayNotas = [];

        // Bandera para saber si el formulario pasó la prueba
        let formularioValido = true;

        // 1. Bucle de Validación Estricta
        for (let input of inputsDeNotas) {
            const valorCrudo = input.value.trim();
            const idAlumno = input.dataset.id; // Asumimos que guardaste el DNI o ID acá
            const nombreAlumno = input.dataset.nombre; // Opcional, para que el alert sea más amigable

            // Regla A: No puede estar vacío (100% de completitud)
            if (valorCrudo === "") {
                alert(`❌ Error: Falta cargar la nota del alumno ${nombreAlumno || idAlumno}. Todos los campos son obligatorios.`);
                input.focus(); // Llevamos el cursor directo al input que falló
                input.classList.add('borde-error'); // Podrías agregarle una clase CSS roja
                formularioValido = false;
                break; // Cortamos el bucle, no seguimos revisando
            }

            const notaNumerica = parseFloat(valorCrudo);

            // Regla B: Tiene que ser un número y estar entre 0 y 10
            if (isNaN(notaNumerica) || notaNumerica < 0 || notaNumerica > 10) {
                alert(`❌ Error: La nota del alumno ${nombreAlumno || idAlumno} es inválida. Debe ser un número entre 0 y 10.`);
                input.focus();
                input.classList.add('borde-error');
                formularioValido = false;
                break;
            }

            // Si pasó las pruebas, lo metemos al carrito limpiando cualquier clase de error anterior
            input.classList.remove('borde-error');
            arrayNotas.push({
                id_inscripcion: idAlumno,
                nota: notaNumerica
            });
        }

        // Si la validación falló, abortamos misión y no enviamos nada al servidor
        if (!formularioValido) {
            return;
        }

        // 2. Si llegamos acá, el 100% de los datos están perfectos. Armamos el paquete.
        const payload = {
            accion: 'guardar_notas',
            token: tokenActual,
            id_comision: parseInt(comisionActual),
            materia: materiaActual,
            instancia: instanciaActual,
            notas: arrayNotas
        };

        // 3. Disparamos el fetch al backend
        const btn = document.getElementById('btnGuardarNotas');
        btn.disabled = true;
        btn.innerHTML = '⏳ Guardando...';

        const resultado = await API.enviarNotasAlServidor(payload);

        // 4. Procesamos la respuesta
        if (resultado.exito) {
            alert("✅ ¡Notas guardadas y bloqueadas exitosamente!");
            // Acá podrías recargar la vista o redirigir al dashboard
        } else {
            alert("⚠️ Error del servidor: " + resultado.mensaje);
        }

        btn.disabled = false;
        btn.innerHTML = 'Guardar Planilla';
    });




    // Escuchamos el buscador de texto en tiempo real
    document.getElementById('filtro-buscar-alumno')?.addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    // Escuchamos los inputs de rango de mérito
    document.getElementById('filtro-merito-min')?.addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    document.getElementById('filtro-merito-max')?.addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });


    // Cuando se reciben los datos por primera vez:
    function inicializarYRenderizarDashboard() {
        // 1. Calculamos los KPIs grandes con la TOTALIDAD de alumnos (una sola vez)
        UImetrics.calcularKpisGlobales(EstadoDashboard.alumnos);

        // 2. Inicializamos los límites numéricos de los inputs
        Filtros.obtenerAlumnosFiltradosPorMerito();

        // 3. Disparamos el primer filtrado (que dibuja tabla, mini-KPIs y gráficos)
        actualizarDashboardFiltrado();

        UImetrics.inicializarSelectorComisiones(EstadoDashboard.alumnos);
        UImetrics.renderizarGraficoComisiones(EstadoDashboard.alumnos, 'todas');
        UImetrics.renderizarTablaComisiones(EstadoDashboard.alumnos);

    }


    // 1. En tu función de actualización habitual:
    function actualizarDashboardFiltrado() {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos);


        UImetrics.renderizarTablaMerito(alumnosFiltrados);

        UImetrics.calcularMiniKpisFiltrados(alumnosFiltrados);

        UImetrics.renderizarRadarDinamico('matematica', 'radarMatematica', COLOR_MATEMATICA.borde, COLOR_MATEMATICA.fondo, alumnosFiltrados);
        UImetrics.renderizarRadarDinamico('lengua', 'radarLengua', COLOR_LENGUA.borde, COLOR_LENGUA.fondo, alumnosFiltrados);
        UImetrics.renderizarRadarDinamico('dibujo', 'radarDibujo', COLOR_DIBUJO.borde, COLOR_DIBUJO.fondo, alumnosFiltrados);
        UImetrics.renderizarGraficoDistribucion(alumnosFiltrados);
        // 🔹 Histograma de distribución de notas

        UImetrics.renderizarGraficoComisiones(EstadoDashboard.alumnos, 'todas');
        UImetrics.renderizarTablaComisiones(alumnosFiltrados);




        UImetrics.renderizarRadarsDocentes(alumnosFiltrados);
        UImetrics.renderizarTablaDocentes(alumnosFiltrados);
    }

    // Listener para el selector de orden de la tabla docente
    document.getElementById('select-ordenar-docentes-tabla')?.addEventListener('change', () => {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos);
        UImetrics.renderizarTablaDocentes(alumnosFiltrados);
    });

    document.getElementById('select-filtro-comision')?.addEventListener('change', (e) => {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos);
        UImetrics.renderizarGraficoComisiones(alumnosFiltrados, e.target.value);
    });

    // 2. Escuchamos el cambio de píldora (General / Matemática / Lengua / Dibujo)
    document.querySelectorAll('input[name="btn-distribucion"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos);
            UImetrics.renderizarGraficoDistribucion(alumnosFiltrados, e.target.value);
        });
    });

    // Escuchamos el cambio en el selector de orden de comisiones
    document.getElementById('select-ordenar-comisiones')?.addEventListener('change', () => {
        const alumnosFiltrados = Filtros.obtenerAlumnosFiltradosPorMerito(EstadoDashboard.alumnos);
        UImetrics.renderizarTablaComisiones(alumnosFiltrados);
    });





    // =================================================================
    // 2. LISTENERS DE FILTROS EN TIEMPO REAL
    // =================================================================

    document.getElementById('filtro-merito-min').addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    document.getElementById('filtro-merito-max').addEventListener('input', () => {
        actualizarDashboardFiltrado();
    });

    // =================================================================
    // 3. DISPARADORES DE CARGA (Sin tareas duplicadas)
    // =================================================================

    // Opción A: Botón "Actualizar" (Fuerza la descarga de datos nuevos)
    document.getElementById('btn-actualizar-graficos').addEventListener('click', async () => {
        const exito = await cargarDatosEstadisticos();
        if (exito) {
            inicializarYRenderizarDashboard();
        }
    });

    // Opción B: Clic en pestaña (Carga automática SOLO si la memoria está vacía)
    document.getElementById('dashboard-tab').addEventListener('click', async () => {
        const sinDatos = !EstadoDashboard.alumnos || EstadoDashboard.alumnos.length === 0;

        if (sinDatos) {
            const exito = await cargarDatosEstadisticos();
            if (exito) {
                inicializarYRenderizarDashboard();
            }
        }
    });



});

async function iniciarSesion(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const clave = document.getElementById('loginClave').value;

    // 1. Mostrar spinner
    UI.setEstadoCargaLogin(true);

    try {
        // 2. Hacer petición al GAS
        const data = await Api.peticionLogin(email, clave);

        if (data.exito) {
            // 3. Guardar sesión y procesar docentes internamente (Delega a Auth)
            Auth.guardarSesion(data);

            // 4. Llenar variables globales locales del main
            usuarioActual = data.perfil;
            aspirantesGlobales = data.datos;
            permisosDocentes = data.permisos_materias;
            eventosGlobales = data.calendario || []; // 🔹 DESCOMENTADO: Ahora sí usamos el calendario

            // 5. Configurar Interfaz General
            UI.configurarInterfazPorRol(usuarioActual);
            UI.inicializarFiltroComisiones(aspirantesGlobales);

            if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
                UI.renderizarDashboardGeneral(aspirantesGlobales);
            }

            // 6. 🔹 Inicializar el Calendario y Cronograma usando los eventos
            UI.inicializarCalendario(eventosGlobales); // Llama a FullCalendar
            
            // Verificá si tu función renderizarTablaCronograma necesita recibir los eventos:
            // Si la función los lee del sessionStorage internamente, así está bien. 
            // Si antes le pasabas el array, deberías hacer: UI.renderizarTablaCronograma(eventosGlobales);
            UI.renderizarTablaCronograma(eventosGlobales); 

            // 7. Disparar dibujados y módulos restantes
            orquestarFiltros();
            UI.inicializarModuloNotas(aspirantesGlobales, permisosDocentes);

            // 8. Forzar la primera vista de la semana
            const selectSemana = document.getElementById('filtro-semana-cronograma');
            if (selectSemana) {
                selectSemana.dispatchEvent(new Event('change'));
            }

        } else {
            alert(data.mensaje || "Credenciales incorrectas.");
        }
    } catch (error) {
        console.error("Fallo durante el inicio de sesión:", error);
        alert("Ocurrió un error al intentar conectar con el servidor.");
    } finally {
        // 9. Restaurar botón
        UI.setEstadoCargaLogin(false);
    }
}


