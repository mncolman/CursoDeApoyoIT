import * as Api from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';
import * as Filtros from './filters.js';
import * as Utils from './utils.js';




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
    // 1. Leemos qué quiere el usuario (El estado actual del DOM)
    const searchRaw = document.getElementById('searchInput').value.toLowerCase();
    // (Podes llamar a quitarAcentos acá si la tenés exportada, o mandarlo raw)
    const search = searchRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const comision = document.getElementById('filterComision').value;
    const sortMethod = document.getElementById('sortSelect').value;

    // 2. Mandamos a calcular (Lógica pura)
    const listaFiltrada = Filtros.filtrarYOrdenar(aspirantesGlobales, search, String(comision), sortMethod);

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
        permisosDocentes = sesion.permisos_docente;

        // Configurar la vista según los permisos (UI.js)
        UI.configurarInterfazPorRol(usuarioActual);

        // Disparar las funciones de renderizado
        if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
            // Asumo que esta función ya la moviste a UI o está global por ahora
            UI.renderizarDashboardGeneral(aspirantesGlobales);
        }

        UI.inicializarFiltroComisiones(aspirantesGlobales);

        orquestarFiltros();
        UI.inicializarModuloNotas(aspirantesGlobales, permisosDocentes);
        UI.inicializarCalendario(eventosGlobales);
    } else {

        // 1. Limpiamos cualquier basura que haya quedado en memoria
        sessionStorage.clear();

        // 2. Nos aseguramos de que el usuario vea SOLO el login
        document.getElementById('login-container').classList.remove('d-none');
        document.getElementById('app-container').classList.add('d-none');
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

    // Listener del boton descargar listado como pdf

document.getElementById('btnDescargarPlanilla').addEventListener('click', () => {
    // 1. Leemos los valores de los selectores en el momento del clic
    const comisionSeleccionada = document.getElementById("filterComision").value;
    const tipoOrden = document.getElementById("sortSelect").value; // Leemos el select de orden

    // 2. Barrera de seguridad
    if (!aspirantesGlobales || aspirantesGlobales.length === 0) {
        Swal.fire('Error', 'No hay alumnos cargados en memoria.', 'error');
        return;
    }

    // 3. CLONAMOS el arreglo para no alterar el caché global por error
    let alumnosAProcesar = [...aspirantesGlobales];


// 4. Aplicamos el ordenamiento exacto según tu HTML
    switch (tipoOrden) {
        case 'nombre_asc':
            // Ordena por apellido de la A a la Z
            alumnosAProcesar.sort((a, b) => a.apellido.localeCompare(b.apellido));
            break;
            
        case 'nombre_desc':
            // Ordena por apellido de la Z a la A (fijate que invertí a y b)
            alumnosAProcesar.sort((a, b) => b.apellido.localeCompare(a.apellido));
            break;
            
        case 'inscripcion_asc':
            // Ordena por número de inscripción de menor a mayor
            alumnosAProcesar.sort((a, b) => a.id_inscripcion - b.id_inscripcion);
            break;
            
        case 'inscripcion_desc':
            // Ordena por número de inscripción de mayor a menor (invertidos)
            alumnosAProcesar.sort((a, b) => b.id_inscripcion - a.id_inscripcion);
            break;
    }

    // 5. Ejecutamos la función pasándole el arreglo ya ORDENADO
    Utils.descargarPlanillaPDF(alumnosAProcesar, comisionSeleccionada);
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
            permisosDocentes = data.permisos_materias;    //permisos_materias viene del backend. en el frontend se traduce a permisosDocentes

            // 5. Configurar Interfaz (Delega a UI)
            UI.configurarInterfazPorRol(usuarioActual);
            UI.inicializarFiltroComisiones(aspirantesGlobales);

            if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
                UI.renderizarDashboardGeneral(aspirantesGlobales);
            }


            // 6. Disparar dibujados
            orquestarFiltros();
            UI.inicializarModuloNotas(aspirantesGlobales, permisosDocentes);
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


