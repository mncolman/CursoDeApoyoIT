const GAS_URL = 'https://script.google.com/macros/s/AKfycbwdzr5LeDwwd-I6XKHCLlwqjA3qcSlppxGGAMMXvBKKpA9A40w1WGzVIzmXN2sk-zyv6g/exec';

export async function peticionLogin(email, clave) {
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