export function guardarSesion(data) {
    sessionStorage.setItem('sesionActiva', 'true');
    // Si viene el token lo guarda, si no, guarda string vacío
    sessionStorage.setItem('token_sesion', data.token || ''); 
    
    // Le agregamos "paracaídas" (||) a todos por si el backend no manda ese dato
    sessionStorage.setItem('usuarioActual', JSON.stringify(data.perfil || {}));
    sessionStorage.setItem('aspirantesGlobales', JSON.stringify(data.datos || []));
    //sessionStorage.setItem('eventosGlobales', JSON.stringify(data.calendario || []));
    
    // Guardamos con la llave 'permisos_docente'
    sessionStorage.setItem('permisos_docente', JSON.stringify(data.permisos_materias || []));
}

// --- archivo: auth.js ---
export function verificarSesionPrevia() {
    if (sessionStorage.getItem('sesionActiva') === 'true') {
        return {
            activa: true,
            // Agregamos paracaídas al leer también, por las dudas
            usuario: JSON.parse(sessionStorage.getItem('usuarioActual') || '{}'),
            aspirantes: JSON.parse(sessionStorage.getItem('aspirantesGlobales') || '[]'),
            eventos: JSON.parse(sessionStorage.getItem('eventosGlobales') || '[]'),
            
            // CORRECCIÓN: Leemos exactamente la misma llave que usamos al guardar
            permisosGuardados: JSON.parse(sessionStorage.getItem('permisos_docente') || '[]')
        };
    }
    return { activa: false };
}

export async function cerrarSesionLocal() {
    
    localStorage.removeItem('token_sesion');
    sessionStorage.clear();
    location.reload(); // Recarga la página volviendo al login
}

