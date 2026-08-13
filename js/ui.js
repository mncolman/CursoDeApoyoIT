// =================================================================
// 1. ESTADO GLOBAL DEL MÓDULO
// =================================================================
let aspirantesGlobalesState = [];
let permisosDocenteState = []; // Guardamos lo que manda el backend
let modoEdicionNotas = false;
let instanciaActual = 'seguimiento'; // Mantenemos las pestañas para Seguimiento/Ensayo
let asignaturaActual = ''; // Ahora arranca vacío hasta que elija en el select

// Diccionario para traducir lo que manda tu backend a las claves de tu frontend
const mapaAsignaturas = {
    'Matematica': 'mat',
    'Lengua': 'len',
    'Dibujo': 'dib'
};


// --- 4. RENDERIZADO DINÁMICO DE LA TABLA DE ASPIRANTES---
export function renderTable(data, isExpandedView) {
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
                <td><span class="badge bg-secondary fw-bold">${asp.comision}</span></td>
                <td>${asp.turno_cursillo}</td>
                <td class="text-uppercase">${asp.departamento}</td>
                <td>${asp.domicilio}</td>
                <td>${asp.tel1}</td>
                <td>${asp.tel2}</td>
                                 <td class="d-flex justify-content-center">
                 <button class="btn btn-sm btn-outline-primary  btn-abrir-ficha" data-id="${asp.id_inscripcion}">Ver Ficha</button>
                 </td>

            `;
        } else {
            tr.innerHTML = `
                <td class="fw-bold">${asp.apellido}, ${asp.nombre}</td>
                <td>${asp.dni}</td>
                <td><span class="badge bg-secondary fw-bold">${asp.comision}</span></td>
                <td>${asp.turno_cursillo}</td>
                <td>${asp.tel1}</td>
                 <td class="d-flex justify-content-center">
                 <button class="btn btn-sm btn-outline-primary  btn-abrir-ficha" data-id="${asp.id_inscripcion}">Ver Ficha</button>
                 </td>
            `;
        }
        tbody.appendChild(tr);
    });
}


// --- 4. FUNCIÓN PARA LLENAR Y ABRIR EL MODAL ---
export function abrirFicha(aspirantesGlobales, idInscripcion) {


    // Buscamos el modal por su ID para borrar un focus que haya quedado pendiente
    const modalFicha = document.getElementById('modalFichaAlumno');

    if (modalFicha) {
        // Escuchamos el evento de Bootstrap que se dispara justo cuando arranca a cerrarse
        modalFicha.addEventListener('hide.bs.modal', () => {
            // Si hay algún botón adentro que retuvo el foco (ej. el botón Cerrar), lo "des-focuseamos"
            if (document.activeElement) {
                document.activeElement.blur();
            }
        });
    }



    // 1. Buscar al aspirante en nuestro estado global (traído de Google Sheets)
    const asp = aspirantesGlobales.find(a => a.id_inscripcion.toString() === idInscripcion.toString());

    if (!asp) {
        alert("No se encontraron los datos del aspirante.");
        return;
    }

    const fechaNacimientoCorrecta = desarmarFechaMutable(asp.nacimiento);

    // 2. Inyectar los datos en el modal
    document.getElementById('ficha-nombre').textContent = `${asp.apellido.toUpperCase()}, ${asp.nombre.toUpperCase()}`;
    document.getElementById('ficha-dni').textContent = asp.dni;
    document.getElementById('ficha-nac').textContent = fechaNacimientoCorrecta;
    document.getElementById('ficha-sexo').textContent = asp.sexo;
    document.getElementById('ficha-inscripcion').textContent = asp.id_inscripcion;
    document.getElementById('ficha-domicilio').textContent = `${asp.domicilio} (${asp.departamento})`;

    // Si la enfermedad está vacía, mostramos "Ninguna" para que no quede en blanco
    document.getElementById('ficha-enfermedad').textContent = asp.enfermedad ? asp.enfermedad : "Ninguna";

    document.getElementById('ficha-colegio').textContent = asp.colegio;
    document.getElementById('ficha-turno-esc').textContent = asp.turno_escuela;

    document.getElementById('ficha-turno-cur').textContent = asp.turno_cursillo;
    document.getElementById('ficha-comision').textContent = String(asp.comision);

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


// Mantenemos la función auxiliar 
function desarmarFechaMutable(fechaRaw) {
    if (!fechaRaw) return "Sin dato";
    let fechaStr = fechaRaw.toString().trim();
    if (fechaStr.length < 5 || fechaStr.length > 6) return fechaRaw; // Por seguridad

    // Lógica de derecha a izquierda
    const yyyy = parseInt(fechaStr.slice(-2)) + 2000;
    const mm = fechaStr.slice(-4, -2);
    let dd = fechaStr.slice(0, -4);
    if (dd.length === 1) dd = '0' + dd;

    return `${dd}/${mm}/${yyyy}`; // Retorna DD/MM/YYYY
}


// =================================================================
// 2. INICIALIZADOR DE NOTAS
// =================================================================
// Ahora la función recibe los permisos que capturaste al hacer el login
export function inicializarModuloNotas(aspirantesGlobales, permisosDocente) {
    aspirantesGlobalesState = aspirantesGlobales;
    permisosDocenteState = permisosDocente || [];

    const selectComision = document.getElementById('selectComisionNotas');
    const selectAsignatura = document.getElementById('selectAsignaturaNotas');

    selectComision.innerHTML = '<option value="">Seleccione Comisión...</option>';
    selectAsignatura.innerHTML = '<option value="">Seleccione Asignatura...</option>';
    selectAsignatura.disabled = true;

    // 1. Llenamos las Comisiones basándonos ESTRICTAMENTE en los permisos
    const comisionesPermitidas = [...new Set(permisosDocenteState.map(p => p.id_comision))]
        .sort((a, b) => a - b);


    comisionesPermitidas.forEach(com => {
        selectComision.innerHTML += `<option value="${com}">Comisión ${com}</option>`;
    });

    // 2. Lógica en Cascada: Al elegir Comisión, se habilitan sus materias
    selectComision.addEventListener('change', (e) => {
        const comSeleccionada = e.target.value;

        // Reseteamos el select de asignaturas
        selectAsignatura.innerHTML = '<option value="">Seleccione Asignatura...</option>';
        asignaturaActual = '';

        if (!comSeleccionada) {
            selectAsignatura.disabled = true;
            renderizarPlanillaNotas();
            return;
        }

        selectAsignatura.disabled = false;

        // Filtramos qué materias da este profe en la comisión seleccionada
        const materiasPermitidas = permisosDocenteState
            .filter(p => String(p.id_comision) === String(comSeleccionada))
            .map(p => p.materia);

        materiasPermitidas.forEach(mat => {
            const claveFront = mapaAsignaturas[mat] || mat.toLowerCase().substring(0, 3);
            selectAsignatura.innerHTML += `<option value="${claveFront}">${mat}</option>`;
        });

        // Auto-seleccionar si solo da una materia en esa comisión (UX Gold)
        if (materiasPermitidas.length === 1) {
            selectAsignatura.selectedIndex = 1;
            asignaturaActual = selectAsignatura.value;
        }

        renderizarPlanillaNotas();
    });

    // 3. Evento al cambiar la Asignatura
    selectAsignatura.addEventListener('change', (e) => {
        asignaturaActual = e.target.value;
        renderizarPlanillaNotas();
    });

    selectAsignatura.addEventListener('change', renderizarPlanillaNotas);

    const btnHabilitar = document.getElementById('btnHabilitarEdicion');
    const nuevoBtnHabilitar = btnHabilitar.cloneNode(true);
    btnHabilitar.parentNode.replaceChild(nuevoBtnHabilitar, btnHabilitar);

    nuevoBtnHabilitar.addEventListener('click', function () {
        if (!selectAsignatura.value) return alert("Seleccioná una comisión primero.");
        modoEdicionNotas = !modoEdicionNotas; // Modifica la global
        this.innerHTML = modoEdicionNotas ? '🔒 Bloquear Planilla' : '✏️ Habilitar Planilla';
        this.classList.toggle('btn-outline-secondary');
        this.classList.toggle('btn-warning');
        document.getElementById('btnGuardarNotasServidor').disabled = !modoEdicionNotas;
        renderizarPlanillaNotas();
    });

    // Listeners Instancias de Evaluación
    document.getElementById('seguimiento-tab').addEventListener('click', (e) => cambiarPestaña('seguimiento', e.target));
    document.getElementById('ensayo-tab').addEventListener('click', (e) => cambiarPestaña('ensayo', e.target));

}

export function cambiarPestaña(instancia, botonHtml) {
    // 1. Actualizamos la variable global
    instanciaActual = instancia;

    // 2. Le sacamos la clase 'active' a todas las pestañas de ese grupo
    document.querySelectorAll('#notasSubTabs .nav-link').forEach(btn => btn.classList.remove('active'));

    // 3. Le ponemos la clase 'active' a la que el usuario acaba de tocar
    botonHtml.classList.add('active');

    // 4. Mandamos a redibujar la tabla con la nueva instancia
    renderizarPlanillaNotas();
}


export function cambiarAsignatura(asignatura, boton) {
    asignaturaActual = asignatura;
    document.querySelectorAll('#asignaturasTabs .nav-link').forEach(btn => btn.classList.remove('active'));
    boton.classList.add('active');
    renderizarPlanillaNotas(); // Llama sin argumentos
}


// =================================================================
// 3. RENDERIZADO (Adaptado)
// =================================================================
export function renderizarPlanillaNotas() {
    const comision = document.getElementById('selectComisionNotas').value;
    const tbody = document.getElementById('tabla-notas-body');
    const headerAsignatura = document.getElementById('header-asignatura');
    const tituloContexto = document.getElementById('tituloContextoNotas');

    // Validación Doble: Si no hay comisión o no hay asignatura elegida, mostramos un mensaje
    if (!comision || !asignaturaActual) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Seleccioná una comisión y una asignatura para empezar.</td></tr>';
        tituloContexto.classList.add('d-none');
        return;
    }

    const nombresAsignaturasInverso = { 'mat': 'Matemática', 'len': 'Lengua', 'dib': 'Dibujo' };
    const nombresInstancias = { seguimiento: '1º Seguimiento', ensayo: 'Ensayo Examen' };

    tituloContexto.textContent = `Comisión ${comision} - ${nombresInstancias[instanciaActual]} - ${nombresAsignaturasInverso[asignaturaActual]}`;
    tituloContexto.classList.remove('d-none');
    headerAsignatura.textContent = nombresAsignaturasInverso[asignaturaActual];

    const alumnos = aspirantesGlobalesState
        .filter(a => String(a.comision) === String(comision))
        .sort((a, b) => String(a.apellido).localeCompare(String(b.apellido)));

    const borradorLocal = JSON.parse(localStorage.getItem(`notas_${instanciaActual}_${comision}`)) || {};

    tbody.innerHTML = '';

    alumnos.forEach((asp, index) => {
        const tr = document.createElement('tr');
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



// --- MÓDULO DE DASHBOARD GENERAL ---
export function renderizarDashboardGeneral(aspirantesGlobales) {
    if (!aspirantesGlobales || aspirantesGlobales.length === 0) return;

    // 1. Métricas Base
    document.getElementById('dashGlobalTotal').textContent = aspirantesGlobales.length;
    document.getElementById('dashGlobalF').textContent = aspirantesGlobales.filter(a => a.sexo?.trim().toUpperCase() === 'F').length;
    document.getElementById('dashGlobalM').textContent = aspirantesGlobales.filter(a => a.sexo?.trim().toUpperCase() === 'M').length;
    document.getElementById('dashGlobalX').textContent = aspirantesGlobales.filter(a => a.sexo?.trim().toUpperCase() === 'X').length;
    document.getElementById('dashGlobalManana').textContent = aspirantesGlobales.filter(a => a.turno_cursillo?.trim().toLowerCase() === '1º').length;
    document.getElementById('dashGlobalTarde').textContent = aspirantesGlobales.filter(a => a.turno_cursillo?.trim().toLowerCase() === '2º').length;

    // 2. Alertas de Salud (Excluimos los vacíos o los que dicen 'no' / 'ninguna')
    const alumnosConSalud = aspirantesGlobales.filter(a => a.enfermedad && a.enfermedad.trim().toLowerCase() !== 'ninguna' && a.enfermedad.trim().toLowerCase() !== 'no' && a.enfermedad.trim() !== '');
    document.getElementById('dashSaludTotal').textContent = alumnosConSalud.length;

    // 3. Procedencia - Departamentos
    const conteoDeptos = aspirantesGlobales.reduce((acc, a) => {
        const depto = a.departamento ? a.departamento.trim().toUpperCase() : 'NO ESPECIFICADO';
        acc[depto] = (acc[depto] || 0) + 1;
        return acc;
    }, {});

    // Ordenamos y tomamos el Top 5
    const topDeptos = Object.entries(conteoDeptos)
        .sort((a, b) => b[1] - a[1])
        ;

    const listaDeptosUL = document.getElementById('listaProcedencia');
    listaDeptosUL.innerHTML = '';
    topDeptos.forEach(([depto, cantidad]) => {
        listaDeptosUL.innerHTML += `
            <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0 border-secondary border-opacity-25">
                <span class="text-truncate text-secondary fw-bold" style="max-width: 80%;">${depto}</span>
                <span class="badge bg-primary rounded-pill">${cantidad}</span>
            </li>
        `;
    });

    // 4. Procedencia - Colegios
    const conteoColegios = aspirantesGlobales.reduce((acc, a) => {
        // Asegurate de que 'a.colegio' coincida con el nombre de la propiedad en tu JSON
        const colegio = a.colegio ? a.colegio.trim().toUpperCase() : 'NO ESPECIFICADO';
        acc[colegio] = (acc[colegio] || 0) + 1;
        return acc;
    }, {});

    // Ordenamos y tomamos el Top 5
    const topColegios = Object.entries(conteoColegios)
        .sort((a, b) => b[1] - a[1])
        ;

    const listaColegiosUL = document.getElementById('listaColegios');
    listaColegiosUL.innerHTML = '';
    topColegios.forEach(([colegio, cantidad]) => {
        listaColegiosUL.innerHTML += `
            <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0 border-secondary border-opacity-25">
                <span class="text-truncate text-secondary fw-bold" style="max-width: 80%;" title="${colegio}">${colegio}</span>
                <span class="badge bg-success rounded-pill">${cantidad}</span>
            </li>
        `;
    });
}



// --- MÓDULO DE CALENDARIO ---
export function inicializarCalendario(eventosGlobales) {
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



// --- archivo: ui.js ---
export function configurarInterfazPorRol(usuario) {
    // Cambiar la interfaz como si recién se hubieran logueado
    document.getElementById('login-container').classList.add('d-none');
    document.getElementById('app-container').classList.remove('d-none');
    document.getElementById('userNameDisplay').textContent = `${usuario.nombre} (${usuario.rol})`;

    // Lógica de Permisos de Interfaz
    const tabDashboard = document.getElementById('nav-item-dashboard');
    if (usuario.rol === 'ADMI' || usuario.rol === 'COOR') {
        tabDashboard.classList.remove('d-none');
    } else {
        tabDashboard.classList.add('d-none');
    }
}


// --- archivo: ui.js ---
export function setEstadoCargaLogin(cargando) {
    const btnLogin = document.getElementById('btnLogin');
    if (cargando) {
        btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Conectando...';
        btnLogin.disabled = true;
    } else {
        btnLogin.innerHTML = 'Ingresar';
        btnLogin.disabled = false;
    }
}


export function actualizarMiniReporte(lista) {   // de tabla aspirantes
    document.getElementById('dashTotal').textContent = lista.length;
    document.getElementById('dashF').textContent = lista.filter(a => a.sexo?.trim().toUpperCase() === 'F').length;
    document.getElementById('dashM').textContent = lista.filter(a => a.sexo?.trim().toUpperCase() === 'M').length;
    document.getElementById('dashX').textContent = lista.filter(a => a.sexo?.trim().toUpperCase() === 'X').length;
}


/**
 * Renderiza la tabla dentro del modal de salud.
 * @param {Array} listaFiltrada - Arreglo de aspirantes con enfermedad != ""
 */
export function renderModalSalud(listaFiltrada) {
    const tbody = document.getElementById('tbodySalud');
    tbody.innerHTML = ''; // Limpiamos

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">No hay alumnos registrados con afecciones de salud.</td></tr>`;
        return;
    }

    listaFiltrada.forEach(asp => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td class="fw-bold">${asp.id_inscripcion}</td>
            <td class="fw-bold">${asp.apellido}, ${asp.nombre}</td>
            <td>${asp.dni}</td>
            <td><span class="badge bg-secondary">${asp.comision || 'S/D'}</span></td>
            <td class="text-danger fw-bold">${asp.enfermedad}</td>
            <td class="text-center">
                <!-- 👉 REUTILIZAMOS LA CLASE Y EL DATA-ID -->
                <button class="btn btn-sm btn-outline-primary btn-abrir-ficha" data-id="${asp.id_inscripcion}" title="Ver ficha completa">
                    <i class="fas fa-id-card"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
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




export function inicializarFiltroComisiones(aspirantesGlobales) {

    const selectFiltro = document.getElementById('filterComision');
    const usuarioString = sessionStorage.getItem('usuarioActual');
    let rolUsuario = "";

    if (usuarioString) {
        // 2. Lo convertimos de nuevo a un objeto real de JS
        const usuario = JSON.parse(usuarioString);

        rolUsuario = usuario.rol;

    }
    // Limpiamos el select por si se vuelve a llamar la función
    selectFiltro.innerHTML = '<option value="">Todas las Comisiones</option>';

    let comisionesAMostrar = [];

    if (rolUsuario === 'ADMI' || rolUsuario === 'COOR') {

        // Extraemos TODAS las comisiones únicas directamente de la base de datos de alumnos
        comisionesAMostrar = [...new Set(aspirantesGlobales.map(a => a.comision))]
            .filter(Boolean) // Filtramos celdas vacías por si algún alumno no tiene comisión
            .sort((a, b) => a - b);

    } else if (rolUsuario === 'DOCE') {


        // Extraemos SOLO las comisiones permitidas desde los permisos del Storage
        const permisosGuardados = JSON.parse(sessionStorage.getItem('permisos_docente')) || [];
        comisionesAMostrar = [...new Set(permisosGuardados.map(p => p.id_comision))]
            .filter(Boolean)
            .sort((a, b) => a - b);
    }else{
    } 
    // Iteramos el arreglo resultante y armamos las opciones del HTML
    comisionesAMostrar.forEach(com => {
        selectFiltro.innerHTML += `<option value="${com}">Comisión ${com}</option>`;
    });

    // Mejora de UX (Opcional): Si el docente solo tiene UNA comisión asignada, 
    // la pre-seleccionamos y disparamos el evento para que la tabla ya se filtre sola.
    if (rolUsuario === 'DOCE' && comisionesAMostrar.length === 1) {
        selectFiltro.value = comisionesAMostrar[0];

        // Disparamos el evento 'change' manualmente para que se aplique el filtro en la tabla
        selectFiltro.dispatchEvent(new Event('change'));
    }

}