// --- 1. ESTADO GLOBAL Y CACHÉ ---

let aspirantesGlobales = [];
let eventosGlobales = [];
let usuarioActual = null;
let isExpandedView = false;

// --- VARIABLES GLOBALES PARA NOTAS ---
let modoEdicionNotas = false;
let instanciaActual = 'seguimiento';
let asignaturaActual = 'mat'; // NUEVO: Por defecto arranca en matemática

const GAS_URL = 'https://script.google.com/a/macros/herrera.unt.edu.ar/s/AKfycbxpKLUC7BLO7mVY2x_f79Y4375F5XRHeSWehegYztt9RTtASPZgNMfnh6ZTxMKv3vklKQ/exec';





// =================================================================
// 2. INICIALIZACIÓN (Cuando carga la página)
// =================================================================
document.addEventListener('DOMContentLoaded', function () {
    // --- LISTENERS ---
    document.getElementById('loginForm').addEventListener('submit', iniciarSesion);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterComision').addEventListener('change', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);

    document.getElementById('viewToggle').addEventListener('change', function (e) {
        isExpandedView = e.target.checked;
        applyFilters();
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





    applyFilters();
});







// --- MÓDULO DE CALENDARIO ---
function inicializarCalendario() {
    const calendarEl = document.getElementById('calendar'); // Asegurate que tu div tenga id="calendar"
    if (!calendarEl) return;

    // Le damos colores automáticos según la materia
    const eventosColoreados = eventosGlobales.map(ev => {
        let colorFondo = '#3788d8'; // Azul por defecto

        const materia = ev.extendedProps.materia.toLowerCase();
        const titulo = ev.title.toLowerCase();

        if (materia.includes('matem')) colorFondo = '#dd1226'; // Rojo
        if (materia.includes('lengua')) colorFondo = '#198754'; // Verde
        if (materia.includes('dibujo')) colorFondo = '#fd7e14'; // Naranja

        return {
            ...ev,
            backgroundColor: colorFondo,
            borderColor: colorFondo
        };
    });

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es', // Para que esté en español
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: eventosColoreados,


        // Al hacer clic en un evento, mostramos el detalle (podés cambiarlo por un modal luego)
        eventClick: function (info) {
            // Capturamos el color del evento para pintar el botón del modal del mismo color
            const colorFondo = info.event.backgroundColor;

            // Formateamos la fecha a formato argentino (DD/MM/YYYY)
            const fechaFormateada = info.event.start.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });

            Swal.fire({
                title: info.event.title,
                html: `
                    <div style="text-align: left; margin-top: 15px; font-size: 1.1em;">
                        <p><strong>📚 Materia:</strong> ${info.event.extendedProps.materia}</p>
                        <p><strong>📅 Fecha:</strong> <span style="text-transform: capitalize;">${fechaFormateada}</span></p>
                        <hr>
                        <p><strong>📝 Detalle de la clase:</strong><br> ${info.event.extendedProps.descripcion}</p>
                    </div>
                `,
                icon: 'info',
                iconColor: colorFondo,
                confirmButtonText: 'Cerrar',
                confirmButtonColor: colorFondo,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown animate__faster'
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp animate__faster'
                }
            });
        }

        
    });

    // Truco para que FullCalendar se dibuje bien dentro de un Tab de Bootstrap
    const tabCalendario = document.querySelector('button[data-bs-target="#calendario"]'); // Ajustá el selector si tu botón tiene otro ID o data-bs-target
    if (tabCalendario) {
        tabCalendario.addEventListener('shown.bs.tab', () => {
            calendar.render();
        });
    } else {
        // Si no estás usando tabs, lo renderizamos directo
        calendar.render();
    }
}




// --- 3. MOTOR DE FILTRADO Y ORDENAMIENTO ---
function applyFilters() {
    // 1. Captura de valores
    const searchRaw = document.getElementById('searchInput').value.toLowerCase();
    const search = quitarAcentos(searchRaw);
    const comision = document.getElementById('filterComision').value;
    const sortMethod = document.getElementById('sortSelect').value; // Nuevo

    // 2. Filtrado
    let filteredData = aspirantesGlobales.filter(asp => {
        const nombreLimpio = quitarAcentos(asp.nombre.toLowerCase());
        const apellidoLimpio = quitarAcentos(asp.apellido.toLowerCase());

        const matchSearch = asp.dni.includes(search) ||
            nombreLimpio.includes(search) ||
            apellidoLimpio.includes(search);

        const matchComision = (comision === "") || (asp.comision === comision);

        return matchSearch && matchComision;
    });

    // 3. Ordenamiento
    filteredData.sort((a, b) => {
        switch (sortMethod) {
            case 'nombre_asc':
                // Concatenamos Apellido y Nombre para un ordenamiento alfabético perfecto
                return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);

            case 'nombre_desc':
                return (b.apellido + b.nombre).localeCompare(a.apellido + a.nombre);

            case 'inscripcion_asc':
                return a.id_inscripcion - b.id_inscripcion;

            case 'inscripcion_desc':
                return b.id_inscripcion - a.id_inscripcion;

            case 'depto_asc':
                // Manejo de valores en caso de que algún depto esté vacío
                const deptoA = a.departamento || "";
                const deptoB = b.departamento || "";
                return deptoA.localeCompare(deptoB);

            default:
                return 0;
        }
    });

    // 4. Enviamos los datos procesados a dibujar
    renderTable(filteredData);
}




// --- 4. RENDERIZADO DINÁMICO DE LA TABLA ---
function renderTable(data) {
    const thead = document.getElementById('tabla-aspirantes-head');
    const tbody = document.getElementById('tabla-aspirantes-body');

    // Limpiamos la tabla
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // 4A. Construir Encabezados según la vista
    const trHead = document.createElement('tr');
    if (isExpandedView) {
        trHead.innerHTML = `
            <th>Nº Insc.</th>
            <th>Apellido y Nombre</th>
            <th>DNI</th>
            <th>Comisión</th>
            <th>Turno</th>
            <th>Depto.</th>
            <th>Domicilio</th>
            <th>Tutor (Principal)</th>
            <th>Tutor (Alternativo)</th>
            <th class="text-center">Acciones</th>
        `;
    } else {
        trHead.innerHTML = `
            <th>Apellido y Nombre</th>
            <th>DNI</th>
            <th>Comisión</th>
            <th>Turno</th>
            <th>Contacto Tutor</th>
            <th class="text-center">Acciones</th>
        `;
    }
    thead.appendChild(trHead);

    // 4B. Construir Filas con los datos filtrados
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No se encontraron aspirantes con esos filtros.</td></tr>`;
        return;
    }

    data.forEach(asp => {
        const tr = document.createElement('tr');

        if (isExpandedView) {
            tr.innerHTML = `
                <td><strong>${asp.id_inscripcion}</strong></td>
                <td class="fw-bold">${asp.apellido}, ${asp.nombre}</td>
                <td>${asp.dni}</td>
                <td><span class="badge bg-secondary">${asp.comision}</span></td>
                <td>${asp.turno_cursillo}</td>
                <td class="text-uppercase">${asp.departamento}</td>
                <td>${asp.domicilio}</td>
                <td>${asp.tel1}</td>
                <td>${asp.tel2}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-primary w-100" onclick="abrirFicha(${asp.id_inscripcion})">Ficha</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td class="fw-bold">${asp.apellido}, ${asp.nombre}</td>
                <td>${asp.dni}</td>
                <td><span class="badge bg-secondary">${asp.comision}</span></td>
                <td>${asp.turno_cursillo}</td>
                <td>${asp.tel1}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-primary w-100" onclick="abrirFicha(${asp.id_inscripcion})">Ver Ficha</button></td>
            `;
        }
        tbody.appendChild(tr);
    });
}


// --- 4. FUNCIÓN PARA LLENAR Y ABRIR EL MODAL ---
function abrirFicha(idInscripcion) {
    // 1. Buscar al aspirante en nuestro estado global (traído de Google Sheets)
    const asp = aspirantesGlobales.find(a => a.id_inscripcion.toString() === idInscripcion.toString());

    if (!asp) {
        alert("No se encontraron los datos del aspirante.");
        return;
    }

    // 2. Inyectar los datos en el modal
    document.getElementById('ficha-nombre').textContent = `${asp.apellido}, ${asp.nombre}`;
    document.getElementById('ficha-dni').textContent = asp.dni;
    document.getElementById('ficha-nac').textContent = asp.nacimiento;
    document.getElementById('ficha-sexo').textContent = asp.sexo;
    document.getElementById('ficha-inscripcion').textContent = asp.id_inscripcion;
    document.getElementById('ficha-domicilio').textContent = `${asp.domicilio} (${asp.departamento})`;

    // Si la enfermedad está vacía, mostramos "Ninguna" para que no quede en blanco
    document.getElementById('ficha-enfermedad').textContent = asp.enfermedad ? asp.enfermedad : "Ninguna";

    document.getElementById('ficha-colegio').textContent = asp.colegio;
    document.getElementById('ficha-turno-esc').textContent = asp.turno_escuela;
    document.getElementById('ficha-turno-cur').textContent = asp.turno_cursillo;

    document.getElementById('ficha-tutor').textContent = asp.tutor;
    document.getElementById('ficha-relacion').textContent = asp.tutor_relacion;
    document.getElementById('ficha-ocupacion').textContent = asp.tutor_ocupacion || "-";
    document.getElementById('ficha-tel1').textContent = asp.tel1;
    document.getElementById('ficha-tel2').textContent = asp.tel2;

    document.getElementById('ficha-observaciones').textContent = asp.observaciones || "Sin observaciones.";

    // 3. Mostrar el modal usando Bootstrap
    const modalElement = document.getElementById('modalFichaAlumno');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}


// Función para eliminar acentos y diacríticos
function quitarAcentos(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}




// --- 5. FUNCIÓN DE LOGIN (Conexión al Backend) ---
async function iniciarSesion(e) {
    e.preventDefault(); // Evita que la página se recargue

    const email = document.getElementById('loginEmail').value;
    const clave = document.getElementById('loginClave').value;
    const btnLogin = document.getElementById('btnLogin');

    // Estado de carga en el botón
    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Conectando...';
    btnLogin.disabled = true;

    try {
        const peticion = {
            accion: 'login',
            email: email,
            clave: clave
        };

        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(peticion)
        });

        const data = await response.json();

        if (data.exito) {
            // 1. Guardar datos en memoria
            usuarioActual = data.perfil;
            aspirantesGlobales = data.datos; // <--- ACÁ RECIÉN SE LLENAN LOS ALUMNOS
            eventosGlobales = data.calendario;

            // 2. Guardar token en localStorage
            localStorage.setItem('token_sesion', data.token);

            // 3. Cambiar la interfaz
            document.getElementById('login-container').classList.add('d-none');
            document.getElementById('app-container').classList.remove('d-none');
            document.getElementById('userNameDisplay').textContent = `${usuarioActual.nombre} (${usuarioActual.rol})`;

            // 4. Disparar el dibujado de la tabla principal
            applyFilters();

            // 5. INICIALIZAR NOTAS ACÁ (Para que ya pueda leer los alumnos) 
            inicializarModuloNotas();

            // 5. INICIALIZAR calendario ACÁ 

            inicializarCalendario();

        } else {
            alert(data.mensaje);
        }
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al intentar conectar con el servidor.");
    } finally {
        // Restaurar botón
        btnLogin.innerHTML = 'Ingresar';
        btnLogin.disabled = false;
    }
}

function cerrarSesionLocal() {
    // Aquí luego sumaremos la llamada al backend para borrar el token en Google
    localStorage.removeItem('token_sesion');
    location.reload(); // Recarga la página volviendo al login
}








// --- INICIALIZADOR DE NOTAS ---
function inicializarModuloNotas() {
    const select = document.getElementById('selectComisionNotas');
    select.innerHTML = '<option value="">Seleccione...</option>';

    const comisionesDisponibles = [...new Set(aspirantesGlobales.map(a => a.comision))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    comisionesDisponibles.forEach(com => {
        select.innerHTML += `<option value="${com}">${com}</option>`;
    });

    select.addEventListener('change', renderizarPlanillaNotas);

    const btnHabilitar = document.getElementById('btnHabilitarEdicion');
    const nuevoBtnHabilitar = btnHabilitar.cloneNode(true);
    btnHabilitar.parentNode.replaceChild(nuevoBtnHabilitar, btnHabilitar);

    nuevoBtnHabilitar.addEventListener('click', function () {
        if (!select.value) return alert("Seleccioná una comisión primero.");
        modoEdicionNotas = !modoEdicionNotas;
        this.innerHTML = modoEdicionNotas ? '🔒 Bloquear Planilla' : '✏️ Habilitar Planilla';
        this.classList.toggle('btn-outline-secondary');
        this.classList.toggle('btn-warning');
        document.getElementById('btnGuardarNotasServidor').disabled = !modoEdicionNotas;
        renderizarPlanillaNotas();
    });

    // Listeners Instancias de Evaluación (Quitamos el data-bs-toggle del HTML para controlarlo manual)
    document.getElementById('seguimiento-tab').addEventListener('click', (e) => cambiarPestaña('seguimiento', e.target, '#notasSubTabs'));
    document.getElementById('ensayo-tab').addEventListener('click', (e) => cambiarPestaña('ensayo', e.target, '#notasSubTabs'));

    // Listeners Asignaturas
    document.getElementById('mat-tab').addEventListener('click', (e) => cambiarAsignatura('mat', e.target));
    document.getElementById('len-tab').addEventListener('click', (e) => cambiarAsignatura('len', e.target));
    document.getElementById('log-tab').addEventListener('click', (e) => cambiarAsignatura('log', e.target));
}

// Funciones auxiliares para cambiar el aspecto visual de las pestañas
function cambiarPestaña(instancia, boton, contenedor) {
    instanciaActual = instancia;
    document.querySelectorAll(`${contenedor} .nav-link`).forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');
    renderizarPlanillaNotas();
}

function cambiarAsignatura(asignatura, boton) {
    asignaturaActual = asignatura;
    document.querySelectorAll('#asignaturasTabs .nav-link').forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');
    renderizarPlanillaNotas();
}

// --- RENDERIZADO Y AUTO-GUARDADO ---
function renderizarPlanillaNotas() {
    const comision = document.getElementById('selectComisionNotas').value;
    const tbody = document.getElementById('tabla-notas-body');
    const headerAsignatura = document.getElementById('header-asignatura');

    if (!comision) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Seleccioná una comisión para empezar.</td></tr>';
        return;
    }

    // Actualizamos el título de la columna
    const nombresAsignaturas = { mat: 'Matemática', len: 'Lengua', log: 'Dibujo' };
    headerAsignatura.textContent = nombresAsignaturas[asignaturaActual];

    const alumnos = aspirantesGlobales.filter(a => a.comision === comision).sort((a, b) => a.apellido.localeCompare(b.apellido));
    const borradorLocal = JSON.parse(localStorage.getItem(`notas_${instanciaActual}_${comision}`)) || {};

    tbody.innerHTML = '';

    alumnos.forEach((asp, index) => {
        const tr = document.createElement('tr');

        // Solo traemos la nota de la asignatura seleccionada
        const nota = borradorLocal[asp.id_inscripcion]?.[asignaturaActual] || '';

        if (modoEdicionNotas) {
            tr.innerHTML = `
                <td>${asp.dni}</td>
                <td class="fw-bold">${asp.apellido}, ${asp.nombre}</td>
                <td><input type="number" class="form-control text-center input-nota fs-5" data-id="${asp.id_inscripcion}" data-materia="${asignaturaActual}" value="${nota}" min="1" max="10"></td>
            `;
        } else {
            tr.innerHTML = `
                <td>${asp.dni}</td>
                <td class="fw-bold">${asp.apellido}, ${asp.nombre}</td>
                <td class="text-center fs-5 fw-bold">${nota || '-'}</td>
            `;
        }
        tbody.appendChild(tr);
    });

    if (modoEdicionNotas) activarNavegacionPorEnterYGuardado(comision);
}

// --- LA MAGIA DEL ENTER Y EL LOCALSTORAGE ---
function activarNavegacionPorEnterYGuardado(comision) {
    const inputs = document.querySelectorAll('.input-nota');

    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            let borrador = JSON.parse(localStorage.getItem(`notas_${instanciaActual}_${comision}`)) || {};

            const id = input.dataset.id;
            const materia = input.dataset.materia;

            if (!borrador[id]) borrador[id] = {};
            borrador[id][materia] = input.value;

            localStorage.setItem(`notas_${instanciaActual}_${comision}`, JSON.stringify(borrador));
            document.getElementById('alertaBorradorNotas').classList.remove('d-none');
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = inputs[index + 1];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        });
    });
}