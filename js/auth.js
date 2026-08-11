

// --- archivo: auth.js ---
export function guardarSesion(data) {
    sessionStorage.setItem('sesionActiva', 'true');
    sessionStorage.setItem('token_sesion', data.token);
    sessionStorage.setItem('usuarioActual', JSON.stringify(data.perfil));
    sessionStorage.setItem('aspirantesGlobales', JSON.stringify(data.datos));
    sessionStorage.setItem('eventosGlobales', JSON.stringify(data.calendario));
}



export async function cerrarSesionLocal() {
    
    localStorage.removeItem('token_sesion');
    sessionStorage.clear();
    location.reload(); // Recarga la página volviendo al login
}


// --- archivo: auth.js ---
export function verificarSesionPrevia() {
    if (sessionStorage.getItem('sesionActiva') === 'true') {
        return {
            activa: true,
            usuario: JSON.parse(sessionStorage.getItem('usuarioActual')),
            aspirantes: JSON.parse(sessionStorage.getItem('aspirantesGlobales')),
            eventos: JSON.parse(sessionStorage.getItem('eventosGlobales'))
        };
    }
    return { activa: false };
}


