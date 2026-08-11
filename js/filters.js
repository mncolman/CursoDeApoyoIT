
// --- archivo: filters.js ---
export function filtrarYOrdenar(listaOriginal, search, comision, sortMethod) {
    // 1. Filtrado
    let filteredData = listaOriginal.filter(asp => {
        // (Asegurate de tener quitarAcentos disponible en este archivo)
        const nombreLimpio = quitarAcentos(asp.nombre.toLowerCase());
        const apellidoLimpio = quitarAcentos(asp.apellido.toLowerCase());

        const matchSearch = asp.dni.includes(search) ||
            nombreLimpio.includes(search) ||
            apellidoLimpio.includes(search);

        const matchComision = (comision === "") || (asp.comision === comision);

        return matchSearch && matchComision;
    });

    // 2. Ordenamiento
    filteredData.sort((a, b) => {
        switch (sortMethod) {
            case 'nombre_asc': return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre);
            case 'nombre_desc': return (b.apellido + b.nombre).localeCompare(a.apellido + a.nombre);
            case 'inscripcion_asc': return a.id_inscripcion - b.id_inscripcion;
            case 'inscripcion_desc': return b.id_inscripcion - a.id_inscripcion;
            case 'depto_asc':
                const deptoA = a.departamento || "";
                const deptoB = b.departamento || "";
                return deptoA.localeCompare(deptoB);
            default: return 0;
        }
    });

    return filteredData; // <-- Solo devuelve la lista procesada
}



// --- LA MAGIA DEL ENTER Y EL LOCALSTORAGE ---
export function activarNavegacionPorEnterYGuardado(comision) {
    const inputs = document.querySelectorAll('.input-nota');

    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            let borrador = JSON.parse(localStorage.getItem(`notas_${instanciaActual}_${comision}`)) || {};

            const id = input.dataset.id;
            const materia = input.dataset.materia;

            if (!borrador[id]) borrador[id] = {};
            borrador[id][materia] = input.value;

            localStorage.setItem(`notas_${instanciaActual}_${comision}`, JSON.stringify(borrador));
            document.getElementById('alertaBorradorNotas').classList.remove('d-none');
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = inputs[index + 1];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        });
    });
}

// Función para eliminar acentos y diacríticos
function quitarAcentos(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
