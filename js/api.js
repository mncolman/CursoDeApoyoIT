const GAS_URL = 'https://script.google.com/a/macros/herrera.unt.edu.ar/s/AKfycbxpKLUC7BLO7mVY2x_f79Y4375F5XRHeSWehegYztt9RTtASPZgNMfnh6ZTxMKv3vklKQ/exec';

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