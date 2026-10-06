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

    inicializarApp();

    // 1. Buscamos el select usando el ID real que me acabas de mostrar
    const selectSemana = document.getElementById('filtro-semana-cronograma');

    // 2. Escuchamos el cambio manual del select
    if (selectSemana) {
        selectSemana.addEventListener('change', () => {
            UI.renderizarTablaCronograma(eventosGlobales || [], selectSemana.value);
        });
    }

    // 3. Cuando el usuario entra a la pestaña, forzamos el redibujado
    // (Asegurate de que 'tab-cronograma' sea el ID de tu botón/enlace de la pestaña)
    const botonPestanaCronograma = document.getElementById('tab-cronograma');
    if (botonPestanaCronograma) {
        botonPestanaCronograma.addEventListener('shown.bs.tab', () => {
            if (eventosGlobales && eventosGlobales.length > 0 && selectSemana) {
                UI.renderizarTablaCronograma(eventosGlobales || [], selectSemana.value);
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
    document.getElementById('btnCerrarSesion').addEventListener('click', Auth.cerrarSesion);

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


    const elementosFiltroTrayectoria = [
        'searchInputTrayectoria',
        'filterComisionTrayectoria',
        'sortSelectTrayectoria'
    ];

    elementosFiltroTrayectoria.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('input', UI.renderizarTrayectoriaGlobal);
            elemento.addEventListener('change', UI.renderizarTrayectoriaGlobal);
        }
    });

    const tabTrayectoria = document.getElementById('trayectoria-tab');
    if (tabTrayectoria) {
        tabTrayectoria.addEventListener('click', () => {

            setTimeout(() => {
                UI.renderizarTrayectoriaGlobal();
            }, 50);
        });
    }



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
    document.getElementById('btnDescargarComisiones').addEventListener('click', () => prepararYDescargar('alumnos'));
    document.getElementById('btnDescargarAsistenciaSemanal').addEventListener('click', () => prepararYDescargar('semanal'));
    document.getElementById('btnDescargarAsistenciaMensual').addEventListener('click', () => prepararYDescargar('mensual'));
    document.getElementById('btnDescargarPlanillaObservaciones').addEventListener('click', () => prepararYDescargar('observaciones'));

    const btnDescargarCompleto = document.getElementById('btnDescargarListadoCompleto');
    if (btnDescargarCompleto) {
        btnDescargarCompleto.addEventListener('click', () => {

            const tipoPDF = 'alumnos';
            let alumnosAProcesar = orquestarFiltros();

            Utils.descargarPlanillaPDF(alumnosAProcesar, "", tipoPDF, true);
        });
    }








    // Escuchamos los cambios en ambos controles y disparamos la MISMA función
    document.getElementById('buscadorGeneral').addEventListener('input', orquestarFiltrosCronograma);
    document.getElementById('filtro-semana-cronograma').addEventListener('change', orquestarFiltrosCronograma);

    function orquestarFiltrosCronograma() {
        // 1. Recolectamos el estado actual de los dos filtros
        const textoBuscado = normalizarTexto(document.getElementById('buscadorGeneral').value || "");
        const filtroSemana = document.getElementById('filtro-semana-cronograma').value;

        // Hacemos el clon profundo para no destruir la variable global original
        let eventosFiltrados = JSON.parse(JSON.stringify(eventosGlobales || []));

        // 2. FILTRO A: Por Semana (Si no eligió "todas")
        if (filtroSemana !== "todas") {
            eventosFiltrados = eventosFiltrados.filter(ev => {
                const semanaEvento = ev.extendedProps ? ev.extendedProps.semana : undefined;
                return String(semanaEvento) === String(filtroSemana);
            });
        }

        // 3. FILTRO B: Por Buscador (Docente o Comisión)
        if (textoBuscado !== "") {
            eventosFiltrados = eventosFiltrados.map(evento => {
                // Filtramos las comisiones internas
                evento.extendedProps.detalleComisiones = evento.extendedProps.detalleComisiones.filter(detalle => {
                    const nombreDocente = detalle.docente ? normalizarTexto(detalle.docente) : "";
                    const numComision = detalle.comision !== undefined ? String(detalle.comision) : "";
                    return nombreDocente.includes(textoBuscado) || numComision.includes(textoBuscado);
                });
                return evento;
            }).filter(evento => {
                // Descartamos los eventos que se quedaron sin comisiones tras el filtro
                return evento.extendedProps.detalleComisiones.length > 0;
            });
        }

        // 4. Enviamos el array final, masticado y listo, a la UI
        UI.renderizarTablaCronograma(eventosFiltrados);

    }

    function normalizarTexto(texto) {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }






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

        // 1. RECOLECTAR CONTEXTO
        const comisionActual = document.getElementById('selectComisionNotas').value;
        const materiaActual = document.getElementById('selectAsignaturaNotas').value;
        const tabActiva = document.querySelector('#notasSubTabs .nav-link.active');
        const instanciaActual = tabActiva.id === 'seguimiento-tab' ? 'bloque_1er_ev' : 'bloque_final';
        const inputsDeNotas = document.querySelectorAll('.input-nota');

        const payloadInfo = {
            comision: comisionActual ? parseInt(comisionActual) : null,
            materia: materiaActual,
            instancia: instanciaActual
        };

        // 2. VALIDAR
        // (Asume que tenés acceso a 'permisosDocentes' y 'usuarioActual' globales)
        const validacion = validarFormularioNotas(inputsDeNotas, payloadInfo, permisosDocentes, usuarioActual);

        if (!validacion.esValido) return;

        // 3. CONFIRMAR
        const confirmacion = await Swal.fire({
            title: '¿Confirmar envío?',
            text: "Verificá bien las notas. Una vez enviadas se bloquearán y no podrás modificarlas.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, enviar notas'
        });

        if (!confirmacion.isConfirmed) return;

        // 4. PREPARAR ENVÍO
        const payloadCompleto = { ...payloadInfo, notas: validacion.arrayNotas };
        const btn = document.getElementById('btnGuardarNotas');
        btn.disabled = true;
        btn.innerHTML = '⏳ Guardando...';

        // 5. EJECUTAR PETICIÓN
        try {
            const resultado = await Api.enviarNotasAlServidor(payloadCompleto);

            if (resultado.exito) {
                // Aplicamos los cambios localmente sin necesidad de recargar la página
                aplicarMutacionLocal(payloadCompleto);

                Swal.fire({
                    icon: 'success',
                    title: '¡Planilla guardada!',
                    text: 'Las notas fueron registradas exitosamente.',
                    confirmButtonColor: '#198754'
                }).then(() => {
                    // Forzamos el recálculo de la vista (dibujará los candados)
                    document.getElementById('selectComisionNotas').dispatchEvent(new Event('change'));
                    // Actualizamos la trayectoria global "en las sombras" por si el usuario cambia de pestaña
                    UI.renderizarTrayectoriaGlobal();
                });

            } else {
                Swal.fire('Error del servidor', resultado.mensaje, 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error de conexión', 'Ocurrió un error de red al contactar al servidor.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '☁️ Enviar al Servidor';
        }
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
        let data = await Api.peticionLogin(email, clave);

        if (data.exito) {
            // Obtenemos los arrays crudos del servidor
            const aspirantesCrudos = data.datos || [];
            const notasCrudas = data.notas_crudas || [];

            // Delegamos el procesamiento pesado a nuestra función privada
            const aspirantesProcesados = cruzarDatosAspirantesNotas(aspirantesCrudos, notasCrudas);

            data.datos = aspirantesProcesados;

            // 3. Guardar sesión (Delega a Auth)
            Auth.guardarSesion(data);

            // 4. Llenar tus variables globales locales del main
            usuarioActual = data.perfil;
            aspirantesGlobales = data.datos;
            eventosGlobales = data.calendario;
            permisosDocentes = data.permisos_docente;    //permisos_materias viene del backend. en el frontend se traduce a permisosDocentes

            // 5. Configurar Interfaz (Delega a UI)
            UI.configurarInterfazPorRol(usuarioActual);
            UI.inicializarFiltroComisiones(aspirantesGlobales, 'filterComision');
            UI.inicializarFiltroComisiones(aspirantesGlobales, 'filterComisionTrayectoria');

            if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
                UI.renderizarDashboardGeneral(aspirantesGlobales);
            }


            // 6. Disparar dibujados
            orquestarFiltros();
            UI.inicializarModuloNotas(aspirantesGlobales, permisosDocentes);


            // 7. Forzamos el dibujado inicial directo (Sin depender de eventos fantasma)
            const selectSemana = document.getElementById('filtro-semana-cronograma');
            if (selectSemana) {
                selectSemana.value = "3"; // Tu semana por defecto

                UI.renderizarTablaCronograma(eventosGlobales || [], selectSemana.value);
            }
            UI.inicializarCalendario(eventosGlobales || []);


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

// =========================================================
// 🛡️ MÓDULO DE VALIDACIÓN DE NOTAS Y PERMISOS
// =========================================================
function validarFormularioNotas(inputsDeNotas, payloadInfo, permisosDocentes, usuarioActual) {
    // 1. Validar Permisos del Docente
    if (usuarioActual.rol === 'DOCE') {

        // Diccionario traductor: convierte el value del HTML al nombre de la Base de Datos
        const diccionarioMaterias = {
            'mat': 'matematica',
            'len': 'lengua',
            'dib': 'dibujo' // Ajustá este si en tu BD dice solo 'dibujo'
        };

        // Tomamos lo que viene del HTML ("len") y lo pasamos a minúsculas
        let materiaCruda = payloadInfo.materia.toString().toLowerCase().trim();

        // Si existe en nuestro diccionario, lo traducimos ("len" -> "lengua")
        let materiaTraducida = diccionarioMaterias[materiaCruda] || materiaCruda;

        // Función para quitar acentos (así "Matemática" es igual a "matematica")
        const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        materiaTraducida = normalizar(materiaTraducida);

        // Buscamos el permiso usando la materia traducida y sin acentos
        const permisoActivo = permisosDocentes.find(p => {
            const comisionCoincide = String(p.id_comision) === String(payloadInfo.comision);
            const materiaCoincide = normalizar(p.materia) === materiaTraducida;
            return comisionCoincide && materiaCoincide;
        });

        if (!permisoActivo) {
            Swal.fire('Acceso Denegado', `No tienes permisos asignados para la comisión ${payloadInfo.comision} y la materia ${payloadInfo.materia}.`, 'error');
            return { esValido: false, arrayNotas: [] };
        }

        const puedeCargar = payloadInfo.instancia === 'bloque_1er_ev'
            ? permisoActivo.puede_cargar_1er
            : permisoActivo.puede_cargar_fin;

        if (!puedeCargar) {
            Swal.fire('Planilla Bloqueada', 'Las notas de esta instancia ya fueron enviadas y bloqueadas. Contacta a un administrador para modificaciones.', 'error');
            return { esValido: false, arrayNotas: [] };
        }
    }

    // 2. Validar Selección Básica
    if (!payloadInfo.comision || !payloadInfo.materia) {
        Swal.fire('Atención', 'Por favor seleccioná una Comisión y una Asignatura antes de guardar.', 'warning');
        return { esValido: false, arrayNotas: [] };
    }

    if (inputsDeNotas.length === 0) {
        Swal.fire('Sin alumnos', 'No hay alumnos listados en la tabla para cargar notas.', 'info');
        return { esValido: false, arrayNotas: [] };
    }

    // 3. Validación Estricta de Inputs
    const arrayNotas = [];
    for (let input of inputsDeNotas) {
        let valorCrudo = input.value.trim().replace(',', '.');
        const idAlumno = input.dataset.dni || input.dataset.id;
        const trPadre = input.closest('tr');
        const nombreAlumno = trPadre ? trPadre.querySelector('td:nth-child(2)').textContent : idAlumno;

        // Regla A: No puede estar vacío
        if (valorCrudo === "") {
            mostrarErrorInput(input, `Falta cargar la nota de ${nombreAlumno}. Todos los campos son obligatorios.`);
            return { esValido: false, arrayNotas: [] };
        }

        const notaNumerica = parseFloat(valorCrudo);

        // Regla B: Número válido entre 0 y 10
        if (isNaN(notaNumerica) || notaNumerica < 0 || notaNumerica > 10) {
            mostrarErrorInput(input, `La nota de ${nombreAlumno} debe ser un número entre 0 y 10 (Ingresaste: "${valorCrudo}").`);
            return { esValido: false, arrayNotas: [] };
        }

        input.classList.remove('is-invalid');
        arrayNotas.push({ id_inscripcion: idAlumno, nota: notaNumerica });
    }

    return { esValido: true, arrayNotas: arrayNotas };
}

function mostrarErrorInput(input, mensaje) {
    input.classList.add('is-invalid');
    Swal.fire({
        icon: 'error',
        title: 'Error de Validación',
        text: mensaje,
        confirmButtonColor: '#0d6efd'
    }).then(() => input.focus());
}


// =========================================================
// 🔄 ACTUALIZACIÓN LOCAL DE ESTADO (Caché del Frontend)
// =========================================================
function aplicarMutacionLocal(payload) {
    // 1. INYECTAR NOTA (Usamos la abreviatura directa del payload: 'mat', 'len', 'dib')
    let materiaAbreviada = payload.materia.toString().toLowerCase().trim();
    const sufijoInstancia = payload.instancia === 'bloque_1er_ev' ? '1er_ev' : 'final';

    // Generará exactamente la clave que espera la UI, ej: 'nota_1er_ev_dib'
    const claveNota = `nota_${sufijoInstancia}_${materiaAbreviada}`;

    payload.notas.forEach(notaNueva => {
        // Buscamos al alumno
        const alumno = aspirantesGlobales.find(a =>
            String(a.id_inscripcion) === String(notaNueva.id_inscripcion) ||
            String(a.dni) === String(notaNueva.id_inscripcion)
        );

        if (alumno) {
            if (!alumno.datos_examen) alumno.datos_examen = {};
            alumno.datos_examen[claveNota] = notaNueva.nota; // Inyecta en el lugar correcto
        }
    });

    // 2. BLOQUEAR PERMISO (Acá SÍ necesitamos traducir para coincidir con la Base de Datos)
    const diccionarioMaterias = {
        'mat': 'matematica',
        'len': 'lengua',
        'dib': 'dibujo'
    };

    let materiaTraducida = diccionarioMaterias[materiaAbreviada] || materiaAbreviada;
    const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    materiaTraducida = normalizar(materiaTraducida);

    const permisoLocal = permisosDocentes.find(p => {
        const comisionCoincide = String(p.id_comision) === String(payload.comision);
        const materiaCoincide = normalizar(p.materia) === materiaTraducida;
        return comisionCoincide && materiaCoincide;
    });

    if (permisoLocal) {
        if (payload.instancia === 'bloque_1er_ev') permisoLocal.puede_cargar_1er = false;
        else permisoLocal.puede_cargar_fin = false;
    }

    // 3. GUARDAR SESIÓN
    const sesionActual = JSON.parse(localStorage.getItem('sesionInstitutoTecnico'));
    if (sesionActual) {
        sesionActual.aspirantesGlobales = aspirantesGlobales;
        sesionActual.permisos_docente = permisosDocentes;
        localStorage.setItem('sesionInstitutoTecnico', JSON.stringify(sesionActual));
    }
}


// =========================================================
// FUNCIONES AUXILIARES PRIVADAS 
// =========================================================
function cruzarDatosAspirantesNotas(aspirantes, notasCrudas) {
    if (!aspirantes || aspirantes.length === 0) return [];

    // 1. Armamos un diccionario (Hash Map) ultra rápido con las notas
    const mapaNotas = {};

    // Empezamos de 1 para saltar los encabezados de la hoja
    for (let i = 1; i < notasCrudas.length; i++) {
        let id = String(notasCrudas[i][0]).trim();
        if (!id) continue;

        let materia = String(notasCrudas[i][1] || "").toLowerCase().trim();
        let instancia = String(notasCrudas[i][2] || "").trim();
        let nota = parseFloat(notasCrudas[i][3]);

        if (!mapaNotas[id]) {
            mapaNotas[id] = {};
        }

        let sufijo = instancia === 'bloque_1er_ev' ? '1er_ev' : 'final';
        mapaNotas[id][`nota_${sufijo}_${materia}`] = nota;
        mapaNotas[id][`estado_${materia}`] = 'Presente';
    }

    // 2. Inyectamos las notas en los aspirantes
    aspirantes.forEach(asp => {
        let idInscripcion = asp.id_inscripcion !== undefined ? String(asp.id_inscripcion).trim() : "";
        asp.datos_examen = mapaNotas[idInscripcion] || {};
    });

    return aspirantes;
}
async function inicializarApp() {
    const sesionGuardada = localStorage.getItem('sesionInstitutoTecnico');
    if (!sesionGuardada) {
        mandarALogin();
        return;
    }

    let sesionCruda = JSON.parse(sesionGuardada);
    
    // 🛡️ ESCUDO: Aseguramos que existan las claves vitales
    usuarioActual = sesionCruda.usuarioActual || sesionCruda.usuario;
    const tokenSeguro = sesionCruda.token;

    if (!usuarioActual || !usuarioActual.email || !tokenSeguro) {
        console.warn("Falta token o usuario. Forzando relogin.");
        mandarALogin();
        return;
    }

    // Dibujado Rápido Local
    aspirantesGlobales = sesionCruda.aspirantesGlobales || sesionCruda.aspirantes || [];
    eventosGlobales = sesionCruda.eventosGlobales || [];
    permisosDocentes = sesionCruda.permisos_docente || sesionCruda.permisos_materias || [];
    
    UI.configurarInterfazPorRol(usuarioActual);
            arrancarInterfazBase();

    Swal.fire({
        title: 'Actualizando datos...',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 🚀 PETICIÓN AL SERVIDOR
        const respuesta = await Api.obtenerDatosFrescos(usuarioActual.email, tokenSeguro);

        if (respuesta.exito) {
            // Actualizamos variables RAM
            aspirantesGlobales = respuesta.datos || [];
            permisosDocentes = respuesta.permisos_docente || [];
            eventosGlobales = respuesta.calendario || [];

            // Guardado Seguro
            let sesionParaGuardar = JSON.parse(localStorage.getItem('sesionInstitutoTecnico'));
            sesionParaGuardar.aspirantesGlobales = aspirantesGlobales;
            sesionParaGuardar.permisos_docente = permisosDocentes;
            sesionParaGuardar.eventosGlobales = eventosGlobales;
            
            localStorage.setItem('sesionInstitutoTecnico', JSON.stringify(sesionParaGuardar));

            arrancarInterfazBase();
            Swal.close(); // Todo salió perfecto, cerramos el cartel
        } else {
            // 🚨 EL SERVIDOR DEVOLVIÓ UN ERROR
            // Si es error de red (Failed to fetch), lo mandamos al Catch para modo offline
            if (respuesta.mensaje && respuesta.mensaje.toLowerCase().includes('fetch')) {
                throw new Error("Error de red");
            } else {
                // Si Apps Script crasheó, mandamos al usuario al login MOSTRANDO el error
                mandarALogin(`El servidor rechazó la conexión: ${respuesta.mensaje}`);
            }
        }

    } catch (error) {
        console.warn("Iniciando Modo Offline:", error);
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Modo Offline.', showConfirmButton: false, timer: 3000 });
    }
}


// Función auxiliar para no repetir código
function mandarALogin(mensajeError = null) {
    Swal.close(); // 🛑 ESTO MATA EL BUCLE INFINITO DEL CARTEL

    sessionStorage.clear();
    // (Opcional: podés limpiar el localStorage acá si querés que borre la sesión corrupta)
    // localStorage.removeItem('sesionInstitutoTecnico'); 

    document.getElementById('login-container').classList.remove('d-none');
    document.getElementById('app-container').classList.add('d-none');

    // Si le pasamos un error, lo muestra en un cartel rojo para que sepamos qué pasó
    if (mensajeError) {
        Swal.fire('Error de carga', mensajeError, 'warning');
    }
}
// =========================================================
// 🎨 MOTOR DE RENDERIZADO UNIFICADO
// =========================================================
function arrancarInterfazBase() {
    if (!usuarioActual) return;

    // 1. Manejo de Contenedores Principales
    document.getElementById('login-container').classList.add('d-none');
    document.getElementById('app-container').classList.remove('d-none');

    if (usuarioActual.rol === 'ADMI' || usuarioActual.rol === 'COOR') {
        UI.renderizarDashboardGeneral(aspirantesGlobales);
    }

    UI.inicializarFiltroComisiones(aspirantesGlobales, 'filterComision');
    UI.inicializarFiltroComisiones(aspirantesGlobales, 'filterComisionTrayectoria');

    if (typeof orquestarFiltros === 'function') orquestarFiltros();

    console.log("holaaa",permisosDocentes);
    UI.inicializarModuloNotas(aspirantesGlobales, permisosDocentes);
    UI.renderizarTablaCronograma(eventosGlobales || []);
    UI.inicializarCalendario(eventosGlobales || []);

    // 🚀 2. FORZAMOS A MOSTRAR LA PRIMERA PESTAÑA (Para que no quede en blanco al hacer F5)
    // Cambiá '#tab-cronograma-btn' por el ID real del botón de tu primera pestaña
    const primerTabBoton = document.querySelector('.nav-link.active') || document.querySelector('.nav-link');
    if (primerTabBoton) {
        primerTabBoton.click(); // Hace un clic virtual para activar el display correcto
    }
}