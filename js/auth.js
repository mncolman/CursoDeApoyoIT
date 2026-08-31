// =================================================================
// ARCHIVO: auth.js
// =================================================================

export function guardarSesion(data) {
    const HORAS_DURACION = 2;
    const tiempoExpiracion = new Date().getTime() + (HORAS_DURACION * 60 * 60 * 1000);

    // Armamos el paquete con TODOS los datos, incluyendo el calendario
    const paqueteSesion = {
        token: data.token || '',
        usuarioActual: data.perfil || {},
        aspirantesGlobales: data.datos || [],
        permisos_docente: data.permisos_materias || [],
        expira: tiempoExpiracion
    };

    localStorage.setItem('sesionInstitutoTecnico', JSON.stringify(paqueteSesion));
}

export function verificarSesionPrevia() {
    const dataGuardada = localStorage.getItem('sesionInstitutoTecnico');
    
    if (!dataGuardada) {
        return { activa: false };
    }

    const sesion = JSON.parse(dataGuardada);
    const ahora = new Date().getTime();

    if (ahora > sesion.expira) {
        console.warn("La sesión expiró por tiempo límite. Requiere nuevo login.");
        cerrarSesion(false); 
        return { activa: false };
    }

    return {
        activa: true,
        token: sesion.token,
        usuario: sesion.usuarioActual,
        aspirantes: sesion.aspirantesGlobales,
        permisos_docente: sesion.permisos_docente,
        eventos: sesion.eventosGlobales // <-- Lo leemos directamente de la misma caja
    };
}

export function cerrarSesion(recargarPagina = true) {
    localStorage.removeItem('sesionInstitutoTecnico');
    
    localStorage.removeItem('eventosGlobales'); 
    
    if (recargarPagina) {
        window.location.reload();
    }
}

