import * as Api from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';
import * as Filtros from './filters.js';




// --- 1. ESTADO GLOBAL Y CACHÉ ---

let aspirantesGlobales = [];
let eventosGlobales = [];
let usuarioActual = null;
let isExpandedView = false;

// --- VARIABLES GLOBALES PARA NOTAS ---
let modoEdicionNotas = false;
let instanciaActual = 'seguimiento';
let asignaturaActual = 'mat'; // NUEVO: Por defecto arranca en matemática




// =================================================================
// 2. funcion puente para invocar filtros
// =================================================================
function orquestarFiltros() {
    // 1. Leemos qué quiere el usuario (El estado actual del DOM)
    const searchRaw = document.getElementById('searchInput').value.toLowerCase();
    // (Podes llamar a quitarAcentos acá si la tenés exportada, o mandarlo raw)
    const search = searchRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const comision = document.getElementById('filterComision').value;
    const sortMethod = document.getElementById('sortSelect').value;

    // 2. Mandamos a calcular (Lógica pura)
    const listaFiltrada = Filtros.filtrarYOrdenar(aspirantesGlobales, search, comision, sortMethod);

    // 3. Mandamos a dibujar (Vista pura)
    UI.actualizarMiniReporte(listaFiltrada);
    UI.renderTable(listaFiltrada, isExpandedView); // Pasale la variable extra isExpandedView si la necesita
}




// =================================================================
// 2. INICIALIZACIÓN (Cuando carga la página)
// =================================================================
document.addEventListener('DOMContentLoaded', function () {

    // --- 1. VERIFICACIÓN Y ORQUESTACIÓN DE SESIÓN ---
    const sesion = Auth.verificarSesionPrevia();

    if (sesion.activa) {
        // Restaurar variables globales en main.js
        usuarioActual = sesion.usuario;
        aspirantesGlobales = sesion.aspirantes;
        eventosGlobales = sesion.eventos;

        // Configurar la vista según los permisos (UI.js)
        UI.configurarInterfazPorRol(usuarioActual);

        // Disparar las funciones de renderizado
        if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
            // Asumo que esta función ya la moviste a UI o está global por ahora
            UI.renderizarDashboardGeneral(aspirantesGlobales);
        }

        orquestarFiltros();
        UI.inicializarModuloNotas(aspirantesGlobales);
        UI.inicializarCalendario(eventosGlobales);
    }


    // --- 2. EVENT LISTENERS GENERALES ---

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
                    UI.abrirFicha(aspirantesGlobales,id);
                    
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

});



async function iniciarSesion(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const clave = document.getElementById('loginClave').value;

    // 1. Mostrar spinner (Delega a UI)
    UI.setEstadoCargaLogin(true);

    try {
        // 2. Hacer petición (Delega a API)
        const data = await Api.peticionLogin(email, clave);

        if (data.exito) {
            // 3. Guardar sesión (Delega a Auth)
            Auth.guardarSesion(data);

            // 4. Llenar tus variables globales locales del main
            usuarioActual = data.perfil;
            aspirantesGlobales = data.datos;
            eventosGlobales = data.calendario;

            // 5. Configurar Interfaz (Delega a UI)
            UI.configurarInterfazPorRol(usuarioActual);

            if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
                UI.renderizarDashboardGeneral(aspirantesGlobales);
            }
            console.log("LLEGO AQUI JEJOX")
            // 6. Disparar dibujados
            orquestarFiltros();
            UI.inicializarModuloNotas(aspirantesGlobales);
            UI.inicializarCalendario(eventosGlobales);

        } else {
            alert(data.mensaje); // Login incorrecto
        }
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al intentar conectar con el servidor.");
    } finally {
        // 7. Restaurar botón (Delega a UI)

        UI.setEstadoCargaLogin(false);
    }
}