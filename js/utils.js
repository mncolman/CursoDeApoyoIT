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

        // =================================================================
        // CASO ESPECIAL: LISTA SÁBANA COMPLETA DE ASISTENCIA A EXÁMENES
        // - Sin división de comisiones (un solo padrón alfabético continuo).
        // - Encabezado institucional completo SOLO en la primera página.
        // - Máximo aprovechamiento vertical (letras compactas, padding mínimo, 45-50 filas por página).
        // - Numeración de páginas discreta al pie ("Página X de Y").
        // =================================================================
        if (tipoDescarga === 'asistencia_examenes') {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const anchoHoja = pdf.internal.pageSize.getWidth();
            const altoHoja = pdf.internal.pageSize.getHeight();
            const centroX = anchoHoja / 2;

            // Clonamos y ordenamos alfabéticamente a TODO el padrón
            const padronCompleto = [...aspirantesFiltrados].sort((a, b) => {
                const apeA = ((a.apellido || '') + ' ' + (a.nombre || '')).trim().toLowerCase();
                const apeB = ((b.apellido || '') + ' ' + (b.nombre || '')).trim().toLowerCase();
                return apeA.localeCompare(apeB, 'es', { sensitivity: 'base' });
            });

            // 1. Estampar logos y encabezado completo en la Página 1
            pdf.addImage(logoIT, 'PNG', 14, 8, 22, 22);
            pdf.addImage(logoUNT, 'PNG', anchoHoja - 32, 8, 18, 22);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(22);
            pdf.text("INSTITUTO TÉCNICO", centroX, 14, { align: "center" });
            pdf.setFont("times", "italic");
            pdf.setFontSize(13);
            pdf.text("Universidad Nacional de Tucumán", centroX, 20, { align: "center" });
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.text("PLANILLA DE ASISTENCIA A EXÁMENES", centroX, 28, { align: "center" });

            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.5);
            pdf.line(14, 32, anchoHoja - 14, 32);

            // Cabeceras y filas
            const cabeceras = [['Nº', 'Apellido y Nombre', 'DNI', 'Matemática\n11/11/26', 'Lengua\n13/11/26', 'Dibujo\n16/11/26']];
            const filas = padronCompleto.map((a, i) => [
                i + 1,
                ((a.apellido || '') + ', ' + (a.nombre || '')).trim().toUpperCase(),
                a.dni || '',
                '',
                '',
                ''
            ]);

            // Dibujar tabla continua multi-página
            pdf.autoTable({
                head: cabeceras,
                body: filas,
                startY: 35, // En la página 1 arranca justo debajo del encabezado
                margin: { top: 12, bottom: 12, left: 14, right: 14 }, // En páginas siguientes arranca desde arriba (12mm)
                theme: 'grid',
                showHead: 'everyPage', // Repite el encabezado de columnas en cada página para no perder referencia
                headStyles: {
                    fillColor: [0, 48, 93],
                    textColor: [255, 255, 255],
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.2,
                    fontSize: 8,
                    cellPadding: 1.2
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1, // Compacto para que quepan muchas filas por página
                    valign: 'middle',
                    lineColor: [100, 100, 100],
                    lineWidth: 0.15,
                    minCellHeight: 5.2
                },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' }, // Nº (para hasta 3 dígitos)
                    1: { cellWidth: 72, halign: 'left' },   // Apellido y Nombre
                    2: { cellWidth: 26, halign: 'center' }, // DNI
                    3: { cellWidth: 25, halign: 'center' }, // Matemática
                    4: { cellWidth: 25, halign: 'center' }, // Lengua
                    5: { cellWidth: 25, halign: 'center' }  // Dibujo
                },
                didDrawPage: function (data) {
                    // Numeración de página discreta al pie
                    const strPagina = "Página " + data.pageNumber;
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "normal");
                    pdf.setTextColor(120, 120, 120);
                    pdf.text(strPagina, centroX, altoHoja - 6, { align: "center" });
                }
            });

            // Reemplazo del total de páginas al finalizar
            const totalPaginas = pdf.internal.getNumberOfPages();
            for (let p = 1; p <= totalPaginas; p++) {
                pdf.setPage(p);
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(120, 120, 120);
                pdf.setFillColor(255, 255, 255);
                pdf.rect(centroX - 25, altoHoja - 9, 50, 6, 'F'); // Limpiar texto previo
                pdf.text("Página " + p + " de " + totalPaginas, centroX, altoHoja - 6, { align: "center" });
            }

            pdf.save("Planilla_Asistencia_Examenes_General_Sabana.pdf");
            setTimeout(() => { Swal.close(); }, 800);
            return;
        }

        // =========================================================
        // PLANILLAS CLÁSICAS POR COMISIÓN O LISTADO GENERAL
        // =========================================================
        let comisionesAProcesar = [];

        if (esListadoCompleto) {
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

        comisionesAProcesar.forEach((comisionActual, index) => {

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

            // Estampar logos y textos
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

            if (index < comisionesAProcesar.length - 1) {
                pdf.addPage();
            }
        });

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
            head: [['Nº', 'Fecha', 'Detalle de la Actividad', 'Finalizado', 'Parcial', 'Pendiente']],
            body: filas,
            startY: 47,
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', valign: 'middle', lineWidth: 0.3 },
            styles: { fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [245, 245, 245] },

            // Configuración de anchos para dejar espacio a los tildes
            columnStyles: {
                0: { cellWidth: 9, halign: 'center' }, // Nº
                1: { cellWidth: 18, halign: 'center' }, // Fecha (Ej: 19/08)
                2: { cellWidth: 'auto' },               // Detalle (Ocupa el resto)
                3: { cellWidth: 20, halign: 'center' },  // Finalizado
                4: { cellWidth: 19, halign: 'center' }, // Parcial
                5: { cellWidth: 19, halign: 'center' }  // Pendiente
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






// =================================================================
// 1. OBTENER ASPIRANTES FILTRADOS Y COMISIÓN ACTIVA EN TRAYECTORIA
// =================================================================
export function obtenerContextoTrayectoria() {
    const dataGuardada = localStorage.getItem('sesionInstitutoTecnico');
    if (!dataGuardada) return { aspirantesFiltrados: [], comisionSeleccionada: '', comisionesPermitidas: [] };

    const sesion = JSON.parse(dataGuardada);
    const todosLosAspirantes = sesion.aspirantesGlobales || [];

    const inputBuscador = (document.getElementById('searchInputTrayectoria')?.value || '').toLowerCase().trim();
    const selectEl = document.getElementById('filterComisionTrayectoria');
    const selectComision = selectEl?.value || '';
    const selectOrden = document.getElementById('sortSelectTrayectoria')?.value || 'nombre_asc';

    // Extraemos qué comisiones tiene cargadas el docente/autoridad en su select
    const comisionesEnSelect = selectEl
        ? Array.from(selectEl.options).map(opt => opt.value).filter(val => val !== "")
        : [];

    // 1. Filtrado por buscador, comisión seleccionada y permisos del select
    let aspirantesFiltrados = todosLosAspirantes.filter(alumno => {
        const id = String(alumno.id_inscripcion || '');
        const dni = String(alumno.dni || '');
        const apellidoNombre = `${alumno.apellido || ''} ${alumno.nombre || ''}`.toLowerCase();
        const comisionAlumno = String(alumno.comision || '');

        const pasaBuscador = id.includes(inputBuscador) || dni.includes(inputBuscador) || apellidoNombre.includes(inputBuscador);

        // Si eligió una comisión puntual, filtra por esa. Si eligió "Todas", filtra por las que tiene disponibles en su select
        const pasaComision = selectComision !== ""
            ? comisionAlumno === selectComision
            : (comisionesEnSelect.length === 0 || comisionesEnSelect.includes(comisionAlumno));

        return pasaBuscador && pasaComision;
    });

    // 2. Ordenamiento idéntico a la tabla en pantalla
    aspirantesFiltrados.sort((a, b) => {
        let valorA, valorB;
        switch (selectOrden) {
            case 'nombre_asc':
                valorA = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
                valorB = `${b.apellido || ''} ${b.nombre || ''}`.toLowerCase();
                return valorA.localeCompare(valorB);
            case 'nombre_desc':
                valorA = `${a.apellido || ''} ${a.nombre || ''}`.toLowerCase();
                valorB = `${b.apellido || ''} ${b.nombre || ''}`.toLowerCase();
                return valorB.localeCompare(valorA);
            case 'inscripcion_asc':
                return (parseInt(a.id_inscripcion) || 0) - (parseInt(b.id_inscripcion) || 0);
            case 'inscripcion_desc':
                return (parseInt(b.id_inscripcion) || 0) - (parseInt(a.id_inscripcion) || 0);
            default:
                return 0;
        }
    });

    return {
        aspirantesFiltrados,
        comisionSeleccionada: selectComision
    };
}

// =================================================================
// 2. DESCARGAR NOTAS DE TRAYECTORIA (PDF por Comisión o Excel)
// tipoEtapa: '1er_ev' | 'ensayo' | 'consolidado'
// formato: 'pdf' | 'excel'
// =================================================================
export async function descargarNotasTrayectoria(tipoEtapa, formato = 'pdf') {
    const { aspirantesFiltrados, comisionSeleccionada } = obtenerContextoTrayectoria();

    if (aspirantesFiltrados.length === 0) {
        Swal.fire('Atención', 'No hay aspirantes para generar el documento con el filtro actual.', 'warning');
        return;
    }

    // Cerramos el modal antes de disparar la descarga
    const modalEl = document.getElementById('modalDescargaNotas');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    // Determinar las comisiones a procesar
    let comisionesAProcesar = [];
    if (comisionSeleccionada !== "") {
        comisionesAProcesar = [String(comisionSeleccionada)];
    } else {
        const unicas = new Set(aspirantesFiltrados.map(a => String(a.comision)));
        comisionesAProcesar = [...unicas]
            .filter(c => c && c.trim() !== 'undefined' && c.trim() !== '')
            .sort((a, b) => parseInt(a) - parseInt(b));
    }

    // --- OPCIÓN A: EXPORTACIÓN A EXCEL (CSV) ---
    if (formato === 'excel') {
        descargarNotasCSV(aspirantesFiltrados, comisionSeleccionada, tipoEtapa);
        return;
    }

    // --- OPCIÓN B: EXPORTACIÓN A PDF CON DISEÑO INSTITUCIONAL ---
    Swal.fire({ title: 'Generando PDF...', didOpen: () => { Swal.showLoading(); } });

    try {
        const { jsPDF } = window.jspdf;
        // Si es consolidado usamos horizontal ('l') para que entren cómodas las 6 columnas de notas, si no vertical ('p')
        const orientacion = tipoEtapa === 'consolidado' ? 'l' : 'p';
        const pdf = new jsPDF(orientacion, 'mm', 'a4');
        const anchoHoja = pdf.internal.pageSize.getWidth();
        const centroX = anchoHoja / 2;

        comisionesAProcesar.forEach((comisionActual, index) => {
            const alumnosDeEstaComision = aspirantesFiltrados.filter(a => String(a.comision) === comisionActual);

            let tituloPrincipal = "";
            let cabeceras = [];
            let filas = [];
            let configExtraTabla = {};

            switch (tipoEtapa) {
                case '1er_ev':
                    tituloPrincipal = "CALIFICACIONES - 1º EVALUACIÓN";
                    cabeceras = [['Nº', 'Apellido y Nombre', 'Matemática', 'Lengua', 'Dibujo']];
                    filas = alumnosDeEstaComision.map((a, i) => [
                        i + 1,
                        `${a.apellido || ''}, ${a.nombre || ''}`,
                        formatearNota(a.datos_examen?.nota_1er_ev_mat),
                        formatearNota(a.datos_examen?.nota_1er_ev_len),
                        formatearNota(a.datos_examen?.nota_1er_ev_dib)
                    ]);
                    configExtraTabla = {
                        columnStyles: {
                            0: { cellWidth: 12, halign: 'center' },
                            1: { cellWidth: 'auto' },
                            2: { cellWidth: 28, halign: 'center' },
                            3: { cellWidth: 28, halign: 'center' },
                            4: { cellWidth: 28, halign: 'center' }
                        }
                    };
                    break;

                case 'ensayo':
                    tituloPrincipal = "CALIFICACIONES - ENSAYO DE EXAMEN";
                    cabeceras = [['Nº', 'Apellido y Nombre', 'Matemática', 'Lengua', 'Dibujo']];
                    filas = alumnosDeEstaComision.map((a, i) => [
                        i + 1,
                        `${a.apellido || ''}, ${a.nombre || ''}`,
                        formatearNota(a.datos_examen?.nota_final_mat),
                        formatearNota(a.datos_examen?.nota_final_len),
                        formatearNota(a.datos_examen?.nota_final_dib)
                    ]);
                    configExtraTabla = {
                        columnStyles: {
                            0: { cellWidth: 12, halign: 'center' },
                            1: { cellWidth: 'auto' },
                            2: { cellWidth: 28, halign: 'center' },
                            3: { cellWidth: 28, halign: 'center' },
                            4: { cellWidth: 28, halign: 'center' }
                        }
                    };
                    break;

                case 'consolidado':
                    tituloPrincipal = "PLANILLA CONSOLIDADA DE CALIFICACIONES";
                    cabeceras = [
                        [
                            { content: 'Nº', rowSpan: 2, styles: { valign: 'middle' } },
                            { content: 'Apellido y Nombre', rowSpan: 2, styles: { valign: 'middle' } },
                            { content: '1º Evaluación de Seguimiento', colSpan: 3, styles: { halign: 'center', fillColor: [172, 26, 33] } },
                            { content: 'Ensayo de Examen', colSpan: 3, styles: { halign: 'center', fillColor: [27, 57, 106] } }
                        ],
                        ['Matemática', 'Lengua', 'Dibujo', 'Matemática', 'Lengua', 'Dibujo']
                    ];
                    filas = alumnosDeEstaComision.map((a, i) => [
                        i + 1,
                        `${a.apellido || ''}, ${a.nombre || ''}`,
                        formatearNota(a.datos_examen?.nota_1er_ev_mat),
                        formatearNota(a.datos_examen?.nota_1er_ev_len),
                        formatearNota(a.datos_examen?.nota_1er_ev_dib),
                        formatearNota(a.datos_examen?.nota_final_mat),
                        formatearNota(a.datos_examen?.nota_final_len),
                        formatearNota(a.datos_examen?.nota_final_dib)
                    ]);
                    configExtraTabla = {
                        columnStyles: {
                            0: { cellWidth: 12, halign: 'center' },
                            1: { cellWidth: 'auto' },
                            2: { cellWidth: 25, halign: 'center' },
                            3: { cellWidth: 25, halign: 'center' },
                            4: { cellWidth: 25, halign: 'center' },
                            5: { cellWidth: 25, halign: 'center' },
                            6: { cellWidth: 25, halign: 'center' },
                            7: { cellWidth: 25, halign: 'center' }
                        }
                    };
                    break;
            }

            // Encabezado Institucional (idéntico a tu diseño original)
            if (typeof logoIT !== 'undefined') pdf.addImage(logoIT, 'PNG', 14, 10, 25, 25);
            if (typeof logoUNT !== 'undefined') pdf.addImage(logoUNT, 'PNG', anchoHoja - 34, 10, 20, 25);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(25);
            pdf.text("INSTITUTO TÉCNICO", centroX, 16, { align: "center" });

            pdf.setFont("times", "italic");
            pdf.setFontSize(14);
            pdf.text("Universidad Nacional de Tucumán", centroX, 23, { align: "center" });

            pdf.setFont("helvetica", "semibold");
            pdf.setFontSize(13);
            pdf.text(`${tituloPrincipal} - Comisión ${comisionActual}`, centroX, 33, { align: "center" });

            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.5);
            pdf.line(14, 38, anchoHoja - 14, 38);

            // Dibujar Tabla con autoTable
            pdf.autoTable({
                head: cabeceras,
                body: filas,
                startY: 42,
                theme: 'grid',
                headStyles: { fillColor: [0, 48, 93], textColor: [255, 255, 255], halign: 'center', lineWidth: 0.3 },
                styles: { fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: [0, 0, 0] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                ...configExtraTabla,

                didParseCell: function (data) {
                    if (data.section === 'body' && data.cell.raw === 'A') {
                        data.cell.styles.textColor = [220, 53, 69]; // Color rojo institucional / Bootstrap danger
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });


            if (index < comisionesAProcesar.length - 1) {
                pdf.addPage();
            }
        });

        let sufijo = comisionSeleccionada ? `Comision_${comisionSeleccionada}` : `Por_Comision`;
        pdf.save(`Notas_${tipoEtapa}_${sufijo}.pdf`);
        setTimeout(() => { Swal.close(); }, 800);

    } catch (error) {
        console.error("Error al generar PDF de notas:", error);
        Swal.fire('Error', 'Hubo un problema al crear el PDF de calificaciones.', 'error');
    }
}

// =================================================================
// 3. AUXILIAR PARA DESCARGAR EN EXCEL (CSV)
// =================================================================
function descargarNotasCSV(aspirantes, comisionSeleccionada, tipoEtapa) {
    let cabeceras = [];
    let filas = [];

    if (tipoEtapa === '1er_ev') {
        cabeceras = ['Nº', 'Apellido y Nombre', 'Comisión', 'Matemática 1º Ev', 'Lengua 1º Ev', 'Dibujo 1º Ev'];
        filas = aspirantes.map((a, i) => [
            i + 1,
            `${a.apellido || ''}, ${a.nombre || ''}`,
            a.comision || '-',
            formatearNotaCSV(a.datos_examen?.nota_1er_ev_mat),
            formatearNotaCSV(a.datos_examen?.nota_1er_ev_len),
            formatearNotaCSV(a.datos_examen?.nota_1er_ev_dib)
        ]);
    } else if (tipoEtapa === 'ensayo') {
        cabeceras = ['Nº', 'Apellido y Nombre', 'Comisión', 'Matemática Ensayo', 'Lengua Ensayo', 'Dibujo Ensayo'];
        filas = aspirantes.map((a, i) => [
            i + 1,
            `${a.apellido || ''}, ${a.nombre || ''}`,
            a.comision || '-',
            formatearNotaCSV(a.datos_examen?.nota_final_mat),
            formatearNotaCSV(a.datos_examen?.nota_final_len),
            formatearNotaCSV(a.datos_examen?.nota_final_dib)
        ]);
    } else {
        cabeceras = ['Nº', 'Apellido y Nombre', 'Comisión', 'Mat. 1º Ev', 'Len. 1º Ev', 'Dib. 1º Ev', 'Mat. Ensayo', 'Len. Ensayo', 'Dib. Ensayo'];
        filas = aspirantes.map((a, i) => [
            i + 1,
            `${a.apellido || ''}, ${a.nombre || ''}`,
            a.comision || '-',
            formatearNotaCSV(a.datos_examen?.nota_1er_ev_mat),
            formatearNotaCSV(a.datos_examen?.nota_1er_ev_len),
            formatearNotaCSV(a.datos_examen?.nota_1er_ev_dib),
            formatearNotaCSV(a.datos_examen?.nota_final_mat),
            formatearNotaCSV(a.datos_examen?.nota_final_len),
            formatearNotaCSV(a.datos_examen?.nota_final_dib)
        ]);
    }

    let csvContent = "\uFEFF" + cabeceras.join(";") + "\n";
    filas.forEach(fila => {
        const linea = fila.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
        csvContent += linea + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sufijo = comisionSeleccionada ? `Comision_${comisionSeleccionada}` : `General`;
    link.setAttribute("href", url);
    link.setAttribute("download", `Notas_${tipoEtapa}_${sufijo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatearNotaCSV(nota) {
    if (nota === null || nota === undefined || nota === '' || nota === '-') {
        return '';
    }
    const notaStr = String(nota).trim();
    if (nota === 0 || notaStr === '0' || notaStr.toUpperCase() === 'A') {
        return '0';
    }
    return notaStr.replace(/\./g, ',');
}

function formatearNota(nota) {
    if (nota === null || nota === undefined || nota === '' || nota === '-') {
        return '-';
    }
    const notaStr = String(nota).trim();
    if (nota === 0 || notaStr === '0' || notaStr.toUpperCase() === 'A') {
        return 'A';
    }
    return String(nota).trim().replace(/\./g, ',');
}

// =================================================================
// 4. DESCARGAR PLANILLAS DE EXAMEN POR GRUPOS / AULAS (PDF)
// =================================================================
export async function descargarPlanillaExamenPorGrupos(aspirantesGlobales, gruposConfig, asignaturaInfo) {
    if (!aspirantesGlobales || aspirantesGlobales.length === 0) {
        Swal.fire('Atención', 'No hay alumnos para generar los grupos.', 'warning');
        return;
    }

    if (!gruposConfig || gruposConfig.length === 0) {
        Swal.fire('Atención', 'Configuración de grupos inválida.', 'warning');
        return;
    }

    Swal.fire({ title: 'Generando Listados por Grupo...', didOpen: () => { Swal.showLoading(); } });

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const anchoHoja = pdf.internal.pageSize.getWidth();
        const altoHoja = pdf.internal.pageSize.getHeight();
        const centroX = anchoHoja / 2;

        // 1. Ordenamos a TODO el universo alfabéticamente antes de repartir
        const padronOrdenado = [...aspirantesGlobales].sort((a, b) => {
            const apeA = ((a.apellido || '') + ' ' + (a.nombre || '')).trim().toLowerCase();
            const apeB = ((b.apellido || '') + ' ' + (b.nombre || '')).trim().toLowerCase();
            return apeA.localeCompare(apeB, 'es', { sensitivity: 'base' });
        });

        // 2. Segmentamos los alumnos por cada grupo según la configuración
        let cursorInicio = 0;
        const totalGrupos = gruposConfig.length;

        gruposConfig.forEach((grupo, idxGrupo) => {
            const cantidadEnGrupo = grupo.cantidad || 0;
            const alumnosDelGrupo = padronOrdenado.slice(cursorInicio, cursorInicio + cantidadEnGrupo);
            cursorInicio += cantidadEnGrupo;

            // Cada grupo arranca en una página nueva si no es el primero
            if (idxGrupo > 0) {
                pdf.addPage();
            }

            // A) Logos institucionales
            pdf.addImage(logoIT, 'PNG', 14, 8, 20, 20);
            pdf.addImage(logoUNT, 'PNG', anchoHoja - 30, 8, 16, 20);

            // B) Títulos
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(18);
            pdf.text("INSTITUTO TÉCNICO", centroX, 13, { align: "center" });

            pdf.setFont("times", "italic");
            pdf.setFontSize(11);
            pdf.text("Universidad Nacional de Tucumán", centroX, 18, { align: "center" });

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.text(`EXAMEN DE INGRESO - ${asignaturaInfo.nombre.toUpperCase()}`, centroX, 24, { align: "center" });

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.text(`Fecha: ${asignaturaInfo.fecha}   |   GRUPO N° ${grupo.numero} (${alumnosDelGrupo.length} alumnos)`, centroX, 29, { align: "center" });

            // C) Campos a completar a mano por el docente (Gabinete / Aula y Docente evaluador)
            pdf.setDrawColor(160, 160, 160);
            pdf.setLineWidth(0.4);
            pdf.line(14, 32, anchoHoja - 14, 32);

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.5);
            pdf.text("Docente:", 14, 37);
            pdf.setFont("helvetica", "normal");
            pdf.text(".....................................................................................................", 28, 37);

            pdf.setFont("helvetica", "bold");
            pdf.text("Gabinete / Aula:", anchoHoja - 75, 37);
            pdf.setFont("helvetica", "normal");
            pdf.text("............................................", anchoHoja - 47, 37);

            // D) Cabeceras y Filas (Observaciones condicional)
            const incluirObs = Boolean(asignaturaInfo.incluirObservaciones);
            const cabeceraColAsignatura = `${asignaturaInfo.nombre}\n${asignaturaInfo.fecha}`;

            const cabeceras = incluirObs
                ? [['Nº', 'Apellido y Nombre', 'DNI', cabeceraColAsignatura, 'Observaciones']]
                : [['Nº', 'Apellido y Nombre', 'DNI', cabeceraColAsignatura]];

            const filas = alumnosDelGrupo.map((a, i) => {
                const nombreComp = ((a.apellido || '') + ', ' + (a.nombre || '')).trim().toUpperCase();
                return incluirObs
                    ? [i + 1, nombreComp, a.dni || '', '', '']
                    : [i + 1, nombreComp, a.dni || '', ''];
            });

            // Configuración de anchos: si no hay observaciones, se amplía el espacio de nombre y firma
            const colStylesConfig = incluirObs
                ? {
                    0: { cellWidth: 10, halign: 'center' }, // Nº
                    1: { cellWidth: 74, halign: 'left' },   // Apellido y Nombre
                    2: { cellWidth: 26, halign: 'center' }, // DNI
                    3: { cellWidth: 32, halign: 'center' }, // Presente / Firma
                    4: { cellWidth: 40, halign: 'left' }    // Observaciones
                }
                : {
                    0: { cellWidth: 12, halign: 'center' }, // Nº
                    1: { cellWidth: 110, halign: 'left' },  // Apellido y Nombre (amplio y legible)
                    2: { cellWidth: 30, halign: 'center' }, // DNI
                    3: { cellWidth: 30, halign: 'center' }  // Presente / Firma
                };

            // E) Renderizar tabla
            pdf.autoTable({
                head: cabeceras,
                body: filas,
                startY: 41,
                margin: { top: 12, bottom: 14, left: 14, right: 14 },
                theme: 'grid',
                showHead: 'everyPage',
                headStyles: {
                    fillColor: [0, 48, 93],
                    textColor: [255, 255, 255],
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.2,
                    fontSize: 8,
                    cellPadding: 1.2
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1.1,
                    valign: 'middle',
                    lineColor: [120, 120, 120],
                    lineWidth: 0.15,
                    minCellHeight: 5.2
                },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                columnStyles: colStylesConfig,
                didDrawPage: function (data) {
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "normal");
                    pdf.setTextColor(120, 120, 120);
                    pdf.text(`Grupo ${grupo.numero} de ${totalGrupos}  -  Página ${data.pageNumber}`, centroX, altoHoja - 6, { align: "center" });
                }
            });
        });

        // Nombre de archivo descriptivo
        const safeNombreMateria = asignaturaInfo.nombre.replace(/\s+/g, '_');
        pdf.save(`Planilla_Examen_${safeNombreMateria}_Por_Grupos.pdf`);
        setTimeout(() => { Swal.close(); }, 800);

    } catch (error) {
        console.error("Error generando grupos PDF:", error);
        Swal.fire('Error', 'Hubo un problema al crear los listados por grupo.', 'error');
    }
}
