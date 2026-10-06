import * as UI from './ui.js';
import * as Utils from './utils.js';

export const EstadoDashboard = {
    alumnos: [],
    examenes: {}
};

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzEwTsLQ4UzrHzPDw5Ppu8Bb7eNMoAM8rmnOCrxPVKEpeNuvtP-VMTUy05r-PsZp3aRBw/exec';
async function peticionAutenticada(accion, datosExtra = {}) {
    let token = sessionStorage.getItem('token_sesion') || '';

    const payload = {
        accion: accion,
        token: token,
        ...datosExtra
    };

    // 🛡️ TRUCO MAESTRO: Mandamos la acción por URL (?accion=...) y por POST
    const urlConAccion = `${GAS_URL}?accion=${encodeURIComponent(accion)}`;

    try {
        const respuesta = await fetch(urlConAccion, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const data = await respuesta.json();
        return data;
        
    } catch (error) {
        console.error(`❌ Fallo en petición [${accion}]:`, error);
        return { exito: false, error: true, mensaje: error.message };
    }
}

// =========================================================
// FUNCIONES ESPECÍFICAS (Usan el enrutador centralizado)
// =========================================================

export async function peticionLogin(usuario, clave) {
    const respuesta = await peticionAutenticada('login', { usuario, clave });
    console.log("Respuesta Login:", respuesta);
    return respuesta;
}

export async function enviarNotasAlServidor(payloadDatos) {
    console.log("Enviando notas al servidor...", payloadDatos);
    
    // Le pasamos todo el objeto payloadDatos desplegado
    const respuesta = await peticionAutenticada('guardar_notas', payloadDatos);
    
    if (respuesta.error || !respuesta.exito) {
        return {
            exito: false,
            mensaje: respuesta.mensaje || "Error al intentar guardar las notas en el servidor."
        };
    }
    
    return respuesta;
}

export async function cargarDatosPlanificacion() {
    const resultado = await peticionAutenticada('obtener_planificacion');

    if (resultado.exito) {
        const eventosFetch = resultado.datos;

        sessionStorage.setItem('eventosGlobales', JSON.stringify(eventosFetch || []));
        UI.inicializarCalendario(eventosFetch);

        // Procesamos y guardamos el banco de datos docente indexado
        const matrizDocentes = Utils.procesarDocentesYComisiones(eventosFetch);
        sessionStorage.setItem('bancoDocentes', JSON.stringify(matrizDocentes));

        return eventosFetch;
    } else {
        console.error("Error al cargar planificación:", resultado.mensaje);
        return [];
    }
}

export async function cargarDatosEstadisticos() {
    const btnActualizar = document.getElementById('btn-actualizar-graficos');
    if (btnActualizar) btnActualizar.innerHTML = "⏳ Cargando...";

    const json = await peticionAutenticada('obtener_estadisticas');

    if (btnActualizar) btnActualizar.innerHTML = "Actualizar Datos";

    if (json.exito) {
        console.log("✅ Datos estadísticos recibidos del servidor.");

        // Guardamos los datos en nuestro Estado Global
        EstadoDashboard.alumnos = json.datos.alumnos;
        EstadoDashboard.examenes = json.datos.estructura_examenes;

        return true;
    } else {
        console.error("❌ Error del servidor al cargar estadísticas:", json.mensaje);
        alert("No se pudieron cargar las estadísticas: " + (json.mensaje || "Error desconocido."));
        return false;
    }
}