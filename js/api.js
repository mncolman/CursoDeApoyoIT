import * as UI from './ui.js';


const GAS_URL = 'https://script.google.com/macros/s/AKfycbwCBucP0mVJYRGke_34enbucw8Th23EHiPoqP9mAmYmK34KkXCbuOzFgtCAWi6F_MNcvg/exec';

export async function peticionLogin(usuario, clave) {
    const peticion = {
        accion: 'login',
        usuario: usuario,
        clave: clave
    };

    const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(peticion)
    });

    return await response.json();
}


/**
 * Envía el lote de calificaciones al backend de GAS.
 * @param {Object} payloadDatos - El objeto JSON con la estructura definida.
 * @returns {Promise<Object>} La respuesta del servidor.
 */
export async function enviarNotasAlServidor(payloadDatos) {
    try {
        // Mostramos un spinner o bloqueamos la pantalla visualmente aquí si queremos
        console.log("Enviando notas al servidor...", payloadDatos);

        const respuesta = await fetch(URL_WEB_APP, {
            method: 'POST',
            // Fetch en GAS requiere que sea text/plain o form-urlencoded a veces para evitar el preflight OPTIONS, 
            // pero si tu setup ya maneja JSON puro, esto va de diez.
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payloadDatos)
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP error! status: ${respuesta.status}`);
        }

        const datosCrudos = await respuesta.json();
        return datosCrudos;

    } catch (error) {
        console.error("Fallo la petición fetch:", error);
        return {
            exito: false,
            mensaje: "Error de red al intentar contactar al servidor. Revisa tu conexión."
        };
    }
}



// =================================================================
// SOLICITAR CRONOGRAMA Y CALENDARIO AL SERVIDOR
// =================================================================
export async function cargarDatosPlanificacion() {
    try {

        // Armamos el paquete
        const paqueteDatos = {
            accion: 'obtener_planificacion'
            // Acá luego podés sumar el token: tokenDocente si implementás la seguridad
        };

        const opciones = {
            method: 'POST',
            // Le agregamos el header text/plain que ayuda con el CORS en Apps Script
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(paqueteDatos)
        };

        const response = await fetch(GAS_URL, opciones);
        if (!response.ok) throw new Error("Error de conexión con el servidor.");

        const resultado = await response.json();

        if (resultado.exito) {
            const eventosFetch = resultado.datos;
            console.log("¡Llegaron los datos del calendario!", eventosFetch);

            sessionStorage.setItem('eventosGlobales', JSON.stringify(eventosFetch || []));


            // Alimentamos las dos vistas con el mismo array
            UI.inicializarCalendario(eventosFetch);
            UI.renderizarTablaCronograma(eventosFetch);
        } else {
            // EL FIX ESTÁ ACÁ: Solo leemos el mensaje que nos mandó el servidor
            console.error("Error del backend:", resultado.mensaje);
        }

    } catch (error) {
        console.error("Fallo crítico al traer el cronograma:", error);
    }
}