// Arriba de todo en tu archivo importamos los logos
import { logoIT, logoUNT } from './assets.js';

export async function descargarPlanillaPDF(aspirantesFiltrados, comisionSeleccionada) {
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
        const pdf = new jsPDF('p', 'mm', 'a4'); // 'l' para hoja apaisada
        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        // =========================================================
        // 1. ESTAMPAR LAS IMÁGENES BASE64
        // =========================================================
        // Sintaxis: pdf.addImage(variable_base64, formato, X, Y, Ancho, Alto)

        // Logo Izquierdo (X: 14mm, Y: 10mm, Ancho: 25mm, Alto: 25mm)
        pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);

        // Logo Derecho (Calculamos el margen derecho: Ancho Total - 14mm de margen - 25mm del logo)
        pdf.addImage(logoUNT, 'PNG', anchoHoja - 39, 10, 20, 25);


        // =========================================================
        // 2. TEXTOS DEL ENCABEZADO
        // =========================================================
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(30);
        pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });

        pdf.setFont("times", "italic");
        pdf.setFontSize(14);
        pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);


        let cabeceras = [];
        let filas = [];

        if (comisionSeleccionada) {
            pdf.text("Comisión " + comisionSeleccionada, centroX, 33, { align: "center" });
            cabeceras = [['DNI', 'Apellido', 'Nombre']];
            filas = alumnosParaDescargar.map(asp => [
                asp.dni, asp.apellido, asp.nombre
            ]);
        } else {
            pdf.text("Todas las comisiones" + comisionSeleccionada, centroX, 33, { align: "center" });
            cabeceras = [['DNI', 'Apellido', 'Nombre', 'Comisión']];
            filas = alumnosParaDescargar.map(asp => [
                asp.dni, asp.apellido, asp.nombre, asp.comision
            ]);
        }

        // Línea separadora
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(14, 38, anchoHoja - 14, 38);


        // =========================================================
        // 3. GENERAR LA TABLA (AutoTable)
        // =========================================================


        pdf.autoTable({
            head: cabeceras,
            body: filas,
            startY: 42, // Arranca en el milímetro 42 (justo abajo de la línea)
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center' },
            styles: { fontSize: 9, cellPadding: 2 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // 4. Descargar
        pdf.save(`Planilla_Comision_${filtroComision || 'Todas'}.pdf`);

        Swal.fire({
            icon: 'success',
            title: '¡Planilla generada!',
            showConfirmButton: false, 
            timer: 1500 // Se cierra solito después de 1.5 segundos
        });

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al crear el PDF.', 'error');
    }
}