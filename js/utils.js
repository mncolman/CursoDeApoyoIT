// Arriba de todo en tu archivo importamos los logos
import { logoIT, logoUNT } from './assets.js';

export async function descargarPlanillaPDF(aspirantesFiltrados, comisionSeleccionada, tipoDescarga) {
    const filtroComision = document.getElementById('filterComision').value;

    // Ya no hace falta hacer document.getElementById acá porque ya te llegó por parámetro
    let alumnosParaDescargar = aspirantesFiltrados;

    if (filtroComision !== "") {
        alumnosParaDescargar = aspirantesFiltrados.filter(a => String(a.comision) === String(filtroComision));
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

        // =========================================================
        // EL SWITCH MÁGICO
        // =========================================================
        switch (tipoDescarga) {

            case 'alumnos':
                tituloPrincipal = "PLANILLA DE ALUMNOS";

                if (comisionSeleccionada) {
                    cabeceras = [['DNI', 'Apellido', 'Nombre']];
                    filas = alumnosParaDescargar.map(a => [a.dni, a.apellido, a.nombre]);
                } else {
                    cabeceras = [['DNI', 'Apellido', 'Nombre', 'Comision']];
                    filas = alumnosParaDescargar.map(a => [a.dni, a.apellido, a.nombre, a.comision]);
                }
                configExtraTabla = {
                    styles: { fontSize: 9, cellPadding: 1 },
                };


                break;

            case 'semanal':
                tituloPrincipal = "ASISTENCIA SEMANAL";
                // Agregamos columnas vacías para que el profe marque los días
                cabeceras = [['Apellido y Nombre', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Observaciones']];
                filas = alumnosParaDescargar.map(a => [`${a.apellido}, ${a.nombre}`, '', '', '', '', '', '']);

                configExtraTabla = {
                    styles: { fontSize: 9, cellPadding: 1 },
                };
                break;

            case 'mensual':
                tituloPrincipal = "ASISTENCIA MENSUAL - Mes: ...................";
                // Planilla intensiva: DNI, Nombre y 20 celdas chiquitas para días hábiles
                cabeceras = [['Apellido y Nombre', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']];
                filas = alumnosParaDescargar.map(a => [`${a.apellido}, ${a.nombre}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);


                orientacion = 'l';

// 1. Definimos los anchos fijos de las primeras dos columnas
                let anchosColumnasMensual = {
                    0: { cellWidth: 45 }  // Apellido y Nombre
                };

                // 2. Bucle automático para asignar el mismo ancho (ej: 6.5 mm) del 2 al 32 (los 31 días)
                // De esta forma todos los días miden exactamente lo mismo y entran perfecto en la hoja
                for (let i = 1; i <= 32; i++) {
                    anchosColumnasMensual[i] = { cellWidth: 7.2, halign: 'center' };
                }

                configExtraTabla = {
                    styles: { fontSize: 7, cellPadding: 1, valign: 'middle' }, 
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
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center' },
            styles: { fontSize: 10, cellPadding: 2, valign: 'middle' },
            alternateRowStyles: { fillColor: [245, 245, 245] },

            // Los tres puntitos inyectan la configuración dinámica del switch
            ...configExtraTabla
        });

        // 4. Descargar
        pdf.save(`Planilla_${tipoDescarga}_${comisionSeleccionada || 'Todas'}.pdf`);

        setTimeout(() => { Swal.close(); }, 1000);

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al crear el PDF.', 'error');
    }
}