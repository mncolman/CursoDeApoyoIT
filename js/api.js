import * as UI from './ui.js';



export const EstadoDashboard = {
    alumnos: [],
    cursillo: [],
    examenes: {},
    docentes: { mapaComisionMateria: {}, docentes: {} }
};

if (typeof window !== 'undefined') {
    window.EstadoDashboard = EstadoDashboard;
}

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxPrYeAQCPFAZtfjUCzACgzYJtSHv3hjzAZUSG8GhQa-OSxga6qlppWn8S4uiuChYde/exec';

export async function peticionLogin(usuario, clave) {
    const peticion = {
        accion: 'login',
        usuario: usuario,
        clave: clave
    };

    const response = await fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(peticion)
    });

    let respuesta = await response.json();

    return respuesta;
}

/**
 * Envía el lote de calificaciones al backend de GAS y actualiza los permisos locales.
 * @param {Object} payloadDatos - El objeto con comision, materia, instancia y notas.
 * @returns {Promise<Object>} La respuesta del servidor.
 */
export async function enviarNotasAlServidor(payloadDatos) {
    try {
        console.log("Enviando notas al servidor...", payloadDatos);

        // 1. Recuperamos la sesión para obtener el token
        const dataGuardada = localStorage.getItem('sesionInstitutoTecnico');
        const sesion = dataGuardada ? JSON.parse(dataGuardada) : {};
        const token = sesion.token || '';

        // 2. Armamos el paquete final sumando la acción y la seguridad
        const peticion = {
            accion: 'guardar_notas',
            token: token,
            usuario: sesion.usuarioActual ? sesion.usuarioActual.email : '',
            ...payloadDatos
        };

        // 3. Disparamos la petición al backend
        // (Asegurate de que GAS_URL esté definida arriba en tu archivo api.js)
        const respuesta = await fetch(GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            redirect: 'follow', // 👇 Agrega esta línea
            body: JSON.stringify(peticion)
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP! status: ${respuesta.status}`);
        }

        const respuestaJSON = await respuesta.json();

        // 4. 🔹 LA MAGIA: Si el backend guardó con éxito, actualizamos la memoria local
        if (respuestaJSON.exito && dataGuardada) {
            const permisos = sesion.permisos_docente || [];

            // Buscamos el permiso exacto que el profe acaba de usar
            const permisoUsado = permisos.find(p =>
                p.id_comision == payloadDatos.comision &&
                p.materia === payloadDatos.materia
            );

            if (permisoUsado) {
                // Le quitamos la llave para que no pueda volver a cargar esta instancia
                if (payloadDatos.instancia === 'bloque_1er_ev') {
                    permisoUsado.puede_cargar_1er = false;
                } else if (payloadDatos.instancia === 'bloque_final') {
                    permisoUsado.puede_cargar_fin = false;
                }

                // Guardamos el paquete actualizado en el navegador
                localStorage.setItem('sesionInstitutoTecnico', JSON.stringify(sesion));
                console.log("Permisos locales actualizados tras el envío.");
            }
        }

        return respuestaJSON;

    } catch (error) {
        console.error("Fallo la petición fetch:", error);
        return {
            exito: false,
            mensaje: "Error de red al intentar contactar al servidor. Revisa tu conexión."
        };
    }
}

export async function cargarDatosPlanificacion() {
    try {
        const paqueteDatos = { accion: 'obtener_planificacion' };
        const opciones = {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(paqueteDatos)
        };

        const response = await fetch(GAS_URL, opciones);
        if (!response.ok) throw new Error("Error de conexión");

        const resultado = await response.json();

        if (resultado.exito) {
            const eventosFetch = resultado.datos;

            // VOLVEMOS AL ORIGEN: Guardamos en sessionStorage
            sessionStorage.setItem('eventosGlobales', JSON.stringify(eventosFetch || []));

            UI.inicializarCalendario(eventosFetch);

            return eventosFetch;
        } else {
            console.error("Error del backend:", resultado.mensaje);
            return [];
        }

    } catch (error) {
        console.error("Fallo crítico:", error);
        return [];
    }
}


export async function obtenerDatosFrescos(email, token) {
    try {
        // Armamos el paquete siguiendo tu estándar
        const paqueteDatos = { 
            accion: 'obtenerDatosFrescos', 
            email: email,
            token: token
        };
        
        const opciones = {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow', 
            body: JSON.stringify(paqueteDatos)
        };

        const response = await fetch(GAS_URL, opciones);
        if (!response.ok) throw new Error("Error de conexión al obtener datos frescos");

        const resultado = await response.json();
        

        return resultado; 

    } catch (error) {
        console.error("Fallo crítico en obtenerDatosFrescos:", error);
        // Devolvemos un objeto estructurado para que el catch de inicializarApp no explote
        return { exito: false, mensaje: error.message }; 
    }
}

export async function cargarDatosEstadisticos() {
    const btnActualizar = document.getElementById('btn-actualizar-graficos');
    if (btnActualizar) btnActualizar.innerHTML = "⏳ Cargando...";

    // Recuperamos la sesión para obtener el token desde localStorage
    const dataGuardada = localStorage.getItem('sesionInstitutoTecnico');
    const sesion = dataGuardada ? JSON.parse(dataGuardada) : {};
    const token = sesion.token || '';

    const payload = {
        accion: 'obtener_estadisticas',
        token: token
    };

    try {
        const urlConAccion = `${GAS_URL}?accion=obtener_estadisticas&token=${encodeURIComponent(token)}`;
        const respuesta = await fetch(urlConAccion, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const json = await respuesta.json();

        if (btnActualizar) btnActualizar.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Actualizar Datos';

        if (json.exito) {
            console.log("✅ [API] Datos estadísticos recibidos del servidor:", json);
            console.log("👥 [API] Total alumnos recibidos:", (json.datos?.alumnos || []).length);
            console.log("🔍 [API] Muestra del primer alumno:", json.datos?.alumnos?.[0]);
            console.log("📊 [API] Estructura de exámenes:", json.datos?.estructura_examenes);
            console.log("📝 [API] Cursillo recibido (total " + (json.datos?.cursillo || []).length + " registros). Muestra:", json.datos?.cursillo?.[0]);

            // Guardamos los datos en nuestro Estado Global
            EstadoDashboard.alumnos = json.datos.alumnos || [];
            EstadoDashboard.examenes = json.datos.estructura_examenes || {};
            EstadoDashboard.cursillo = json.datos.cursillo || [];
            EstadoDashboard.docentes = json.datos?.docentes || { mapaComisionMateria: {}, docentes: {} };
            sessionStorage.setItem('bancoDocentes', JSON.stringify(EstadoDashboard.docentes));
            console.log("👨‍🏫 [API DOCENTES] Objeto docentes recibido en JSON:", json.datos?.docentes);

            return true;
        } else {
            console.error("❌ Error del servidor al cargar estadísticas:", json.mensaje);
            alert("No se pudieron cargar las estadísticas: " + (json.mensaje || "Error desconocido."));
            return false;
        }
    } catch (error) {
        console.error("❌ Fallo de red al cargar estadísticas:", error);
        if (btnActualizar) btnActualizar.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Actualizar Datos';
        alert("Error de conexión al cargar estadísticas: " + error.message);
        return false;
    }
}
