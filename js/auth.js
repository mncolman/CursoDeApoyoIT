// =================================================================
// ARCHIVO: auth.js
// =================================================================

    export function guardarSesion(data) {
    // 1. Definir el tiempo de vida (Ej: 2 horas)
    const HORAS_DURACION = 2;
    const tiempoExpiracion = new Date().getTime() + (HORAS_DURACION * 60 * 60 * 1000);

    // 2. Armar el paquete sumándole los paracaídas (||) por si falta un dato
    const paqueteSesion = {
        token: data.token || '',
        usuarioActual: data.perfil || {},
        aspirantesGlobales: data.datos || [],
        permisos_docente: data.permisos_materias || [],
        expira: tiempoExpiracion
    };

    // 3. Guardar en localStorage (sobrevive a PDFs y pestañas cerradas)
    localStorage.setItem('sesionInstitutoTecnico', JSON.stringify(paqueteSesion));
}

export function verificarSesionPrevia() {
    // 1. Buscamos el paquete en la memoria
    const dataGuardada = localStorage.getItem('sesionInstitutoTecnico');
    
    if (!dataGuardada) {
        return { activa: false };
    }

    const sesion = JSON.parse(dataGuardada);
    const ahora = new Date().getTime();

    // 2. Verificamos si la sesión ya caducó (pasaron las 2 horas)
    if (ahora > sesion.expira) {
        console.warn("La sesión expiró por tiempo límite. Requiere nuevo login.");
        cerrarSesion(false); // Llamamos a cerrarSesion sin recargar la página todavía
        return { activa: false };
    }

    // 3. Si el tiempo está vigente, devolvemos los datos para main.js
    return {
        activa: true,
        token: sesion.token,
        usuario: sesion.usuarioActual,
        aspirantes: sesion.aspirantesGlobales,
        permisos_docente: sesion.permisos_docente,
        
        // Leemos los eventos del localStorage (guardados previamente por Api.js)
        eventos: JSON.parse(localStorage.getItem('eventosGlobales') || '[]')
    };
}

export function cerrarSesion(recargarPagina = true) {
    // Limpiamos todo rastro de la sesión
    localStorage.removeItem('sesionInstitutoTecnico');
    localStorage.removeItem('eventosGlobales');
    
    if (recargarPagina) {
        window.location.reload();
    }
}

