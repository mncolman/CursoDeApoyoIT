// --- 1. ESTADO GLOBAL Y CACHÉ ---

let aspirantesGlobales = []; // Reemplaza a mockAspirantes
let usuarioActual = null;
let isExpandedView = false;


const GAS_URL = 'https://script.google.com/macros/s/AKfycbzfjyVx6m2_-HCg8ACOQZBE_4cykOrsXf2PJalFYr8jBdAYXwU_Bkj2PE967-iWc_dqeg/exec';

document.addEventListener('DOMContentLoaded', function () {

    // --- 2. LISTENERS ---
    document.getElementById('loginForm').addEventListener('submit', iniciarSesion);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterComision').addEventListener('change', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);

    // Listener del interruptor de vista
    document.getElementById('viewToggle').addEventListener('change', function (e) {
        isExpandedView = e.target.checked;
        applyFilters(); // Re-renderiza la tabla con las columnas nuevas
    });

    // Render inicial al cargar la página
    applyFilters();




    // --- 2. CONFIGURACIÓN DE FULLCALENDAR ---
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '08:00:00', // Horario escolar
        slotMaxTime: '22:00:00',
        events: [
            { title: 'Matemáticas - Com. 3', start: '2026-08-07T14:00:00', end: '2026-08-07T16:00:00', color: '#0d6efd' },
            { title: 'Simulacro Examen', start: '2026-08-08T09:00:00', end: '2026-08-08T12:00:00', color: '#dc3545' }
        ]
    });

    // --- 3. RE-RENDERIZAR CALENDARIO AL CAMBIAR DE PESTAÑA ---
    // FullCalendar calcula su tamaño al cargar. Si está oculto, se rompe. 
    // Esto lo soluciona obligándolo a recalcular al mostrar la pestaña.
    var calendarioTab = document.getElementById('calendario-tab');
    calendarioTab.addEventListener('shown.bs.tab', function () {
        calendar.render();
    });
});


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
            aspirantesGlobales = data.datos; // <--- ACÁ LLEGAN LOS ALUMNOS

            // 2. Guardar token en localStorage
            localStorage.setItem('token_sesion', data.token);

            // 3. Cambiar la interfaz
            document.getElementById('login-container').classList.add('d-none');
            document.getElementById('app-container').classList.remove('d-none');
            document.getElementById('userNameDisplay').textContent = `${usuarioActual.nombre} (${usuarioActual.rol})`;

            // 4. Disparar el dibujado de la tabla
            applyFilters();

        } else {
            alert(data.mensaje); // "Contraseña incorrecta", etc.
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