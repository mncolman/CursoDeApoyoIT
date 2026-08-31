// Arriba de todo en tu archivo importamos los logos
import { logoIT, logoUNT } from './assets.js';

export async function descargarPlanillaPDF(aspirantesFiltrados, comisionSeleccionada, tipoDescarga, esListadoCompleto = false) {

    if (aspirantesFiltrados.length === 0 && tipoDescarga !== 'observaciones') {
        Swal.fire('Atención', 'No hay alumnos para generar el documento.', 'warning');
        return;
    }

    Swal.fire({ title: 'Generando PDF...', didOpen: () => { Swal.showLoading(); } });

    try {
        const { jsPDF } = window.jspdf;

        // 2. Identificar qué comisiones vamos a procesar
        let comisionesAProcesar = [];
        
        if (esListadoCompleto) {
            // Si es listado completo, forzamos un array de un solo elemento para que el bucle dé una sola vuelta
            comisionesAProcesar = ["COMPLETO"];
        } else if (comisionSeleccionada !== "") {
            comisionesAProcesar = [String(comisionSeleccionada)];
        } else {
            if (tipoDescarga === 'observaciones' && aspirantesFiltrados.length === 0) {
                comisionesAProcesar = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
            } else {
                const unicas = new Set(aspirantesFiltrados.map(a => String(a.comision)));
                comisionesAProcesar = [...unicas]
                    .filter(c => c && c.trim() !== 'undefined' && c.trim() !== '')
                    .sort((a, b) => parseInt(a) - parseInt(b));
            }
        }

        let orientacion = (tipoDescarga === 'mensual' || tipoDescarga === 'observaciones') ? 'l' : 'p';
        const pdf = new jsPDF(orientacion, 'mm', 'a4');
        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        // =========================================================
        // BUCLE DE HOJAS
        // =========================================================
        comisionesAProcesar.forEach((comisionActual, index) => {
            
            // Si es listado completo, metemos a TODOS. Si no, filtramos por la comisión de esta vuelta
            let alumnosDeEstaComision = esListadoCompleto 
                ? aspirantesFiltrados 
                : aspirantesFiltrados.filter(a => String(a.comision) === comisionActual);

            let tituloPrincipal = "";
            let subtitulo = "";
            let cabeceras = [];
            let filas = [];
            let configExtraTabla = {};

            switch (tipoDescarga) {
                case 'alumnos':
                    tituloPrincipal = "PLANILLA DE ALUMNOS";
                    
                    // Si es listado completo, mostramos la columna de "Comisión" extra
                    if (esListadoCompleto) {
                        cabeceras = [['Nº', 'DNI', 'Apellido', 'Nombre', 'Comisión']];
                        filas = alumnosDeEstaComision.map((a, i) => [i + 1, a.dni, a.apellido, a.nombre, a.comision || '-']);
                    } else {
                        cabeceras = [['Nº', 'DNI', 'Apellido', 'Nombre']];
                        filas = alumnosDeEstaComision.map((a, i) => [i + 1, a.dni, a.apellido, a.nombre]);
                    }
                    
                    configExtraTabla = {
                        styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0] },
                        columnStyles: { 0: { cellWidth: 10, halign: 'center' } }
                    };
                    break;

                case 'semanal':
                    tituloPrincipal = "ASISTENCIA SEMANAL";
                    cabeceras = [['Nº', 'Apellido y Nombre', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Observaciones']];
                    filas = alumnosDeEstaComision.map((a, i) => [i + 1, `${a.apellido}, ${a.nombre}`, '', '', '', '', '', '']);
                    configExtraTabla = { styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0] }, columnStyles: { 0: { cellWidth: 10, halign: 'center' } } };
                    break;

                case 'mensual':
                    tituloPrincipal = "ASISTENCIA MENSUAL - Mes: ...................";
                    cabeceras = [['Nº', 'Apellido y Nombre', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']];
                    filas = alumnosDeEstaComision.map((a, i) => [i + 1, `${a.apellido}, ${a.nombre}`, ...Array(31).fill('')]);
                    let anchosColumnasMensual = { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 45 } };
                    for (let i = 2; i <= 32; i++) { anchosColumnasMensual[i] = { cellWidth: 7.2, halign: 'center' }; }
                    configExtraTabla = { styles: { fontSize: 7, cellPadding: 1, valign: 'middle', lineColor: [0, 0, 0] }, columnStyles: anchosColumnasMensual };
                    break;

                case 'observaciones':
                    tituloPrincipal = "PLANILLA DE OBSERVACIONES";
                    subtitulo = esListadoCompleto 
                        ? `Comisión: TODAS   -   Docente: ....................................................`
                        : `Comisión: ........ ${comisionActual} ........   -   Docente: ....................................................`;
                    cabeceras = [['Nº', 'Apellido y Nombre', 'Documento', 'Fecha', 'Observación']];
                    filas = Array.from({ length: 14 }, () => ['', '', '', '', '']);
                    configExtraTabla = { styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], minCellHeight: 9 }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 45 }, 2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 23 }, 4: { cellWidth: 'auto' } } };
                    break;
            }

            // 5. Estampar logos y textos
            pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);
            pdf.addImage(logoUNT, 'PNG', anchoHoja - 34, 10, 20, 25);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(25);
            pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });
            pdf.setFont("times", "italic");
            pdf.setFontSize(14);
            pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });
            pdf.setFont("helvetica", "semibold");
            pdf.setFontSize(13);

            // Si es listado completo, no ponemos " - Comisión X" en el título general
            const textoComisionInfo = (!esListadoCompleto && tipoDescarga !== 'observaciones') ? ` - Comisión ${comisionActual}` : (esListadoCompleto ? " (General)" : "");
            pdf.text(tituloPrincipal + textoComisionInfo, centroX, 33, { align: "center" });

            let startYTabla = 42;
            let startYLinea = 38;

            if (subtitulo !== "") {
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(11);
                pdf.text(subtitulo, centroX, 39, { align: "center" });
                startYLinea = 42;
                startYTabla = 46;
            }

            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.5);
            pdf.line(14, startYLinea, anchoHoja - 14, startYLinea);

            // 6. Dibujar la tabla
            pdf.autoTable({
                head: cabeceras,
                body: filas,
                startY: startYTabla,
                theme: 'grid',
                headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', lineWidth: 0.3 },
                styles: { fontSize: 10, cellPadding: 2, valign: 'middle' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                ...configExtraTabla,
            });

            // 7. Hoja nueva si no es la última vuelta
            if (index < comisionesAProcesar.length - 1) {
                pdf.addPage();
            }
        });

        // 8. Guardar el PDF unificado
        let nombreArchivo = `Planilla_${tipoDescarga}`;
        if (esListadoCompleto) nombreArchivo += `_General_Sabana.pdf`;
        else if (comisionSeleccionada) nombreArchivo += `_Comision_${comisionSeleccionada}.pdf`;
        else nombreArchivo += `_Separadas_Por_Comision.pdf`;
        
        pdf.save(nombreArchivo);
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


// =================================================================
// RENDERIZAR PDF DEL CRONOGRAMA POR ÁREA
// =================================================================
export async function descargarPlanillaCronograma(eventosGlobales, areaSeleccionada) {

    // 1. Normalizamos el texto para evitar problemas con mayúsculas/tildes
    const areaNormalizada = areaSeleccionada.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();


    // 2. FILTRO PARA EL AÑO 2026
    const fechaCorte = new Date("2026-08-31T00:00:00"); // Lunes 31 de Agosto (año actual)

    const eventosArea = eventosGlobales.filter(ev => {
        // Verificamos la materia
        const materiaEvento = ev.extendedProps?.materia || "";
        const materiaLimpia = materiaEvento.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const coincideMateria = materiaLimpia === areaNormalizada;

        // Verificamos la fecha (le sumamos T12:00:00 para evitar desfasajes horarios de medianoche)
        const fechaEvento = new Date(ev.start + "T12:00:00");
        const esFechaPosterior = fechaEvento >= fechaCorte;

        // Tiene que cumplir ambas condiciones
        return coincideMateria && esFechaPosterior;
    });



    if (eventosArea.length === 0) {
        Swal.fire('Atención', `No hay clases programadas para el área de ${areaSeleccionada}.`, 'warning');
        return;
    }

    Swal.fire({ title: 'Generando Cronograma...', didOpen: () => { Swal.showLoading(); } });

    try {
        // 3. Ordenamos cronológicamente (vital para un seguimiento)
        eventosArea.sort((a, b) => new Date(a.start) - new Date(b.start));

        // 4. Mapeamos los datos a las filas de la tabla
        const filas = eventosArea.map((ev, index) => {
            // Formateo rápido de fecha
            const fechaObj = new Date(ev.start + "T12:00:00");

            let fechaStr = fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' });
            // Pone la primera letra en mayúscula y elimina la coma
            fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1).replace(',', '');

            // Extraemos solo el tema (le sacamos el prefijo "Materia - ")
            let tema = ev.title;
            let descripcion = ev.extendedProps.descripcion;
            if (tema.includes(' - ')) {
                tema = tema.split(' - ')[1];
            }

            // Retornamos el array de la fila. Las últimas dos celdas van vacías para tildar.
            return [
                index + 1,
                fechaStr,
                tema.toUpperCase() + ' - ' + (descripcion),
                ''  // Celda Finalizado
            ];
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        // =========================================================
        // ESTAMPAR CABECERAS (Reutilizando tu formato)
        // =========================================================
        pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);
        pdf.addImage(logoUNT, 'PNG', anchoHoja - 34, 10, 20, 25);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(25);
        pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });

        pdf.setFont("times", "italic");
        pdf.setFontSize(14);
        pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });

        pdf.setFont("helvetica", "semibold");
        pdf.setFontSize(13);

        const tituloPrincipal = `CRONOGRAMA DE ACTIVIDADES - ${areaSeleccionada.toUpperCase()}`;
        pdf.text(tituloPrincipal, centroX, 33, { align: "center" });

// 1. Dibujamos la línea separadora ARRIBA del subtítulo (Y = 37)
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(14, 37, anchoHoja - 14, 37);

        // 2. Subtítulo de Docente y Comisión ABAJO de la línea (Y = 43)
        const subtitulo = "Comisión: ....................................................   -   Docente: ....................................................";
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.text(subtitulo, centroX, 43, { align: "center" });


        // =========================================================
        // AUTO-TABLE
        // =========================================================
        pdf.autoTable({
            head: [['Nº', 'Fecha', 'Detalle de la Actividad', 'Finalizado']],
            body: filas,
            startY: 47,
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', valign: 'middle', lineWidth: 0.3 },
            styles: { fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [245, 245, 245] },

            // Configuración de anchos para dejar espacio a los tildes
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' }, // Nº
                1: { cellWidth: 20, halign: 'center' }, // Fecha (Ej: 19/08)
                2: { cellWidth: 'auto' },               // Detalle (Ocupa el resto)
                3: { cellWidth: 20, halign: 'center' }  // Finalizado
            }
        });

        pdf.save(`Cronograma_${areaSeleccionada}.pdf`);
        setTimeout(() => { Swal.close(); }, 1000);

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al crear el cronograma.', 'error');
    }
}




// =================================================================
// RENDERIZAR PDF DEL CRONOGRAMA DE LA SEMANA SELECCIONADA
// =================================================================
export async function descargarCronogramaSemanal(eventosGlobales) {
    
    // 1. Capturamos qué semana está viendo el usuario ahora mismo
    const selectSemana = document.getElementById('filtro-semana-cronograma');
    if (!selectSemana) return;
    const semanaSeleccionada = selectSemana.value;

    // 2. Filtramos los eventos de esa semana exacta
    const eventosSemana = eventosGlobales.filter(ev => {
        const semanaEvento = ev.extendedProps ? ev.extendedProps.semana : undefined;
        return String(semanaEvento) === String(semanaSeleccionada);
    });

    if (eventosSemana.length === 0) {
        Swal.fire('Atención', `No hay clases programadas para la Semana ${semanaSeleccionada}.`, 'warning');
        return;
    }

    Swal.fire({ title: 'Generando Cronograma...', didOpen: () => { Swal.showLoading(); } });

    try {
        // 3. Ordenamos cronológicamente
        eventosSemana.sort((a, b) => new Date(a.start) - new Date(b.start));

        // 4. Mapeamos los datos igual que en la tabla HTML, pero para PDF
        const filas = eventosSemana.map(ev => {
            const props = ev.extendedProps;

            // -- FECHA --
            const fechaObj = new Date(ev.start + "T12:00:00");
            let fechaStr = fechaObj.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1).replace(',', '');
            
            // (Replicamos los horarios fijos que tenés en la UI)
            const fechaYHora = `${fechaStr}\n1º - 17:00 a 18:20\n2º - 18:50 a 20:10`;

            // -- TEMA --
            let temaClase = ev.title;
            if (temaClase.includes(' - ')) {
                temaClase = temaClase.split(' - ')[1];
            }

            const actividad = `${props.materia || '-'}\n${temaClase} ${props.descripcion}`;

            // -- AGRUPACIÓN DE DOCENTES Y COMISIONES --
            const comisiones = props.detalleComisiones || [];
            let listadoDocentesGabinete = "Sin asignar";

            if (comisiones.length > 0) {
                const agrupados = comisiones.reduce((acc, c) => {
                    const clave = `${c.docente} (${c.aula || 'Sin aula'})`;
                    if (!acc[clave]) acc[clave] = [];
                    acc[clave].push(c.comision);
                    return acc;
                }, {});

                const lineas = Object.entries(agrupados).map(([datosDocente, arrayComisiones]) => {
                    return `Com. ${arrayComisiones.join(', ')} - ${datosDocente}`;
                });
                // ATENCIÓN ACÁ: Usamos \n en lugar de <br> para el salto de línea en el PDF
                listadoDocentesGabinete = lineas.join('\n'); 
            }

            return [
                fechaYHora,
                listadoDocentesGabinete,
                actividad
            ];
        });

        // 5. ARMADO DEL PDF (Usamos 'l' para Landscape/Horizontal)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4'); 
        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        // --- CABECERAS ---
        pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);
        pdf.addImage(logoUNT, 'PNG', anchoHoja - 34, 10, 20, 25);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(25);
        pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });

        pdf.setFont("times", "italic");
        pdf.setFontSize(14);
        pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });

        pdf.setFont("helvetica", "semibold");
        pdf.setFontSize(13);
        pdf.text(`CRONOGRAMA DETALLADO - SEMANA ${semanaSeleccionada}`, centroX, 33, { align: "center" });

        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(14, 38, anchoHoja - 14, 38);

        // --- TABLA ---
        pdf.autoTable({
            head: [['Fecha y Hora', 'Docente y Comisiones', 'Actividad del Día']],
            body: filas,
            startY: 42,
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', valign: 'middle', lineWidth: 0.3 },
            styles: { fontSize: 9, cellPadding: 3, valign: 'middle', lineColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            
            // Ajustamos anchos para aprovechar la hoja apaisada
            columnStyles: {
                0: { cellWidth: 35, halign: 'center' }, // Fecha y Hora
                1: { cellWidth: 100 },                  // Docentes (la más ancha porque agrupa varios)
                2: { cellWidth: 'auto' }                // Actividad
            }
        });

        pdf.save(`Cronograma_Semana_${semanaSeleccionada}.pdf`);
        setTimeout(() => { Swal.close(); }, 1000);

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al crear el PDF.', 'error');
    }
}