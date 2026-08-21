// Arriba de todo en tu archivo importamos los logos
import { logoIT, logoUNT } from './assets.js';

export async function descargarPlanillaPDF(aspirantesFiltrados, comisionSeleccionada, tipoDescarga) {

    // Filtramos usando el PARÁMETRO, no el document.getElementById
    let alumnosParaDescargar = aspirantesFiltrados;

    if (comisionSeleccionada !== "") {
        alumnosParaDescargar = aspirantesFiltrados.filter(a => String(a.comision) === String(comisionSeleccionada));
    }

    if (alumnosParaDescargar.length === 0) {
        Swal.fire('Atención', 'No hay alumnos en esta comisión.', 'warning');
        return;
    }

    Swal.fire({ title: 'Generando PDF...', didOpen: () => { Swal.showLoading(); } });

    try {
        const { jsPDF } = window.jspdf;
        let orientacion = 'p';

        // Variables dinámicas que van a cambiar según el botón
        let tituloPrincipal = "";
        let cabeceras = [];
        let filas = [];
        let configExtraTabla = {}; // Para pisar estilos si necesitamos achicar cosas

        switch (tipoDescarga) {

            case 'alumnos':
                tituloPrincipal = "PLANILLA DE ALUMNOS";

                if (comisionSeleccionada) {
                    cabeceras = [['Nº', 'DNI', 'Apellido', 'Nombre']];
                    // Agregamos (a, index) y ponemos index + 1 al principio
                    filas = alumnosParaDescargar.map((a, index) => [index + 1, a.dni, a.apellido, a.nombre]);
                } else {
                    cabeceras = [['Nº', 'DNI', 'Apellido', 'Nombre', 'Comision']];
                    filas = alumnosParaDescargar.map((a, index) => [index + 1, a.dni, a.apellido, a.nombre, a.comision]);
                }
                configExtraTabla = {
                    styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0] },
                    // Le damos un ancho chiquito al contador para que no robe espacio
                    columnStyles: { 0: { cellWidth: 10, halign: 'center' } }
                };
                break;

            case 'semanal':
                tituloPrincipal = "ASISTENCIA SEMANAL";
                cabeceras = [['Nº', 'Apellido y Nombre', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Observaciones']];
                filas = alumnosParaDescargar.map((a, index) => [index + 1, `${a.apellido}, ${a.nombre}`, '', '', '', '', '', '']);

                configExtraTabla = {
                    styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0] },
                    columnStyles: { 0: { cellWidth: 10, halign: 'center' } }
                };
                break;

            case 'mensual':
                tituloPrincipal = "ASISTENCIA MENSUAL - Mes: ...................";
                cabeceras = [['Nº', 'Apellido y Nombre', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']];
                // Hacemos que el map devuelva el número de fila, el nombre y los espacios vacíos correspondientes
                filas = alumnosParaDescargar.map((a, index) => [
                    index + 1,
                    `${a.apellido}, ${a.nombre}`,
                    ...Array(31).fill('') // Truco para generar los 31 espacios vacíos dinámicamente y no hardcodear comillas
                ]);

                orientacion = 'l';

                // CORRIMOS LOS ÍNDICES PORQUE AHORA HAY UNA COLUMNA NUEVA AL PRINCIPIO
                let anchosColumnasMensual = {
                    0: { cellWidth: 8, halign: 'center' }, // Índice 0: El contador (Nº)
                    1: { cellWidth: 45 }                   // Índice 1: Apellido y Nombre
                };

                // Del índice 2 al 32 están las celdas de los 31 días
                for (let i = 2; i <= 32; i++) {
                    anchosColumnasMensual[i] = { cellWidth: 7.2, halign: 'center' };
                }

                configExtraTabla = {
                    styles: { fontSize: 7, cellPadding: 1, valign: 'middle', lineColor: [0, 0, 0] },
                    columnStyles: anchosColumnasMensual
                };
                break;
        }

        const pdf = new jsPDF(orientacion, 'mm', 'a4');

        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        // =========================================================
        // ESTAMPAR CABECERAS (Esto se ejecuta siempre igual)
        // =========================================================
        pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);
        //                             X,Y alto, ancho
        pdf.addImage(logoUNT, 'PNG', anchoHoja - 34, 10, 20, 25);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(25);
        pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });

        pdf.setFont("times", "italic");
        pdf.setFontSize(14);
        pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });

        pdf.setFont("helvetica", "semibold");
        pdf.setFontSize(13);

        // Usamos el título dinámico
        const textoComision = comisionSeleccionada ? ` - Comisión ${comisionSeleccionada}` : "";
        pdf.text(tituloPrincipal + textoComision, centroX, 33, { align: "center" });

        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(14, 38, anchoHoja - 14, 38);

        // =========================================================
        // AUTO-TABLE
        // =========================================================
        pdf.autoTable({

            head: cabeceras,
            body: filas,
            startY: 42,
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', lineWidth: 0.3 },
            styles: {
                fontSize: 10, cellPadding: 2, valign: 'middle'
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },

            // Los tres puntitos inyectan la configuración dinámica del switch
            ...configExtraTabla,
        });

        // 4. Descargar
        pdf.save(`Planilla_${tipoDescarga}_${comisionSeleccionada || 'Todas'}.pdf`);

        setTimeout(() => { Swal.close(); }, 1000);

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al crear el PDF.', 'error');
    }
}



export async function descargarPlanillaSaludPDF(listaFiltrada) {
    if (!listaFiltrada || listaFiltrada.length === 0) {
        Swal.fire('Atención', 'No hay alumnos en la lista para descargar.', 'warning');
        return;
    }

    Swal.fire({ title: 'Generando PDF de Salud...', didOpen: () => { Swal.showLoading(); } });

    try {
        const { jsPDF } = window.jspdf;
        // Usamos 'l' (landscape/horizontal) porque hay muchas columnas y textos largos
        const pdf = new jsPDF('l', 'mm', 'a4');

        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        // --- CABECERAS Y FILAS ---
        const cabeceras = [['Nº', 'Nº ins.', 'Apellido y Nombre', 'DNI', 'Comisión', 'Afección / Enfermedad', 'Tel. principal', 'Tel. Alternativo']];

        const filas = listaFiltrada.map((a, index) => [
            index + 1,
            a.id_inscripcion,
            `${a.apellido}, ${a.nombre}`,
            a.dni,
            a.comision || '-',
            a.enfermedad,
            // ATENCIÓN: Reemplazá 'a.telefono_padre' y 'a.telefono_alternativo' 
            // por los nombres exactos que tengan esas variables en tu base de datos/JSON
            a.tel1 + " (" + a.tutor_relacion + ")" || 'S/D',
            a.tel2 || 'S/D'
        ]);

        // --- ESTAMPADO DE ENCABEZADO ---
        pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);
        pdf.addImage(logoUNT, 'PNG', anchoHoja - 34, 10, 20, 25);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(25);
        pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });

        pdf.setFont("times", "italic");
        pdf.setFontSize(14);
        pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(220, 53, 69); // Le ponemos color rojo oscuro al título por ser tema de salud
        pdf.text("LISTADO DE ALUMNOS CON AFECCIONES DE SALUD", centroX, 33, { align: "center" });

        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(14, 38, anchoHoja - 14, 38);

        // --- TABLA ---
        pdf.autoTable({
            head: cabeceras,
            body: filas,
            startY: 42,
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', lineWidth: 0.3 }, // Cabecera roja
            styles: { fontSize: 9, cellPadding: 1, valign: 'middle', lineColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [250, 240, 240] }, // Fondo rosadito muy claro intercalado
            columnStyles: {
                0: { cellWidth: 7, halign: 'center' }, // Nº
                1: { cellWidth: 10, halign: 'center' }, // Nº
                3: { cellWidth: 19, halign: 'center' },  // Comisión
                4: { cellWidth: 19, halign: 'center' }  // Comisión
            }
        });

        pdf.save(`Planilla_Salud.pdf`);

        setTimeout(() => { Swal.close(); }, 800);

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al crear el PDF.', 'error');
    }
}