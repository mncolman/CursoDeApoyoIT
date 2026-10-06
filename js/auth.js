import * as Utils from './utils.js'; // 👈 Fundamental para poder llamar a la función

export function guardarSesion(data) {
    sessionStorage.setItem('sesionActiva', 'true');
    sessionStorage.setItem('token_sesion', data.token || '');

    sessionStorage.setItem('usuarioActual', JSON.stringify(data.perfil || {}));
    sessionStorage.setItem('aspirantesGlobales', JSON.stringify(data.datos || []));

    // Guardamos los eventos crudos si existen
    const eventos = data.calendario || [];
    sessionStorage.setItem('eventosGlobales', JSON.stringify(eventos));

    // 🔹 ACÁ ESTÁ LA CLAVE: Procesamos los eventos y guardamos el índice indexado de docentes
    const matrizDocentes = Utils.procesarDocentesYComisiones(eventos);
    sessionStorage.setItem('bancoDocentes', JSON.stringify(matrizDocentes));

    sessionStorage.setItem('permisos_docente', JSON.stringify(data.permisos_docente || data.permisos_materias || []));
}

export function verificarSesionPrevia() {
    if (sessionStorage.getItem('sesionActiva') === 'true') {
        return {
            activa: true,
            usuario: JSON.parse(sessionStorage.getItem('usuarioActual') || '{}'),
            aspirantes: JSON.parse(sessionStorage.getItem('aspirantesGlobales') || '[]'),
            eventos: JSON.parse(sessionStorage.getItem('eventosGlobales') || '[]'),
            permisosGuardados: JSON.parse(sessionStorage.getItem('permisos_docente') || '[]'),

            // 🔹 Recuperamos el índice procesado
            bancoDocentes: JSON.parse(sessionStorage.getItem('bancoDocentes') || '{"mapaComisionMateria":{},"docentes":{}}')
        };
    }
    return { activa: false };
}

export async function cerrarSesionLocal() {

    localStorage.removeItem('token_sesion');
    sessionStorage.clear();
    location.reload(); // Recarga la página volviendo al login
}

