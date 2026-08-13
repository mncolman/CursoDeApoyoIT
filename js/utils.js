export async function descargarPlanillaPDF(aspirantesGlobales) {
    // 1. Leemos el filtro actual
    const filtroComision = document.getElementById('filterComision').value;
    
    let alumnosParaDescargar = aspirantesGlobales;
    if (filtroComision !== "") {
        alumnosParaDescargar = aspirantesGlobales.filter(a => String(a.comision) === String(filtroComision));
    }

    if (alumnosParaDescargar.length === 0) {
        Swal.fire('Atención', 'No hay alumnos para descargar.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Generando PDF...',
        html: 'Armando el documento, por favor esperá.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 2. Inicializamos jsPDF (vertical 'p', milímetros, A4)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // 3. Preparamos los datos
        const cabeceras = [['DNI', 'Apellido', 'Nombre', 'Comisión']];
        const filas = alumnosParaDescargar.map(asp => [
            asp.dni, 
            asp.apellido, 
            asp.nombre, 
            asp.comision
        ]);

        // 4. Título del PDF
        const tituloPDF = filtroComision 
            ? `Planilla de Alumnos - Comisión ${filtroComision}` 
            : 'Planilla General de Alumnos';

        pdf.setFontSize(16);
        pdf.text(tituloPDF, 14, 15); // x: 14, y: 15

        // 5. Generamos la tabla mágica
        pdf.autoTable({
            head: cabeceras,
            body: filas,
            startY: 25, // Arranca debajo del título
            theme: 'grid', // Estilo tabla con bordes
            headStyles: { fillColor: [41, 128, 185] }, // Azulcito lindo para la cabecera
            styles: { fontSize: 10 },
            alternateRowStyles: { fillColor: [245, 245, 245] } // Filas cebra
        });

        // 6. Descarga
        pdf.save(`${tituloPDF.replace(/ /g, '_')}.pdf`);

        Swal.fire({
            icon: 'success',
            title: '¡PDF Listo!',
            text: 'Descarga completada.',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Error al generar PDF:", error);
        Swal.fire('Error', 'Hubo un problema al crear el archivo PDF.', 'error');
    }
}