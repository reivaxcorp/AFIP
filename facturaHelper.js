const { parse, format } = require('date-fns');

function generarDocDefinition(facturaGenerada, ventaData, items) {
    try {
        // Formatear la fecha de vencimiento del CAE
        const fechaVencimientoCAE = parse(facturaGenerada.caeFchVto, 'yyyyMMdd', new Date());
        const fechaVencimientoFormateadaCAE = format(fechaVencimientoCAE, 'dd/MM/yyyy');

        // Formatear la fecha de proceso
        const fechaProceso = parse(facturaGenerada.fechaEmision, 'yyyyMMddHHmmss', new Date());
        const fechaProcesoFormateada = format(fechaProceso, 'dd/MM/yyyy HH:mm:ss');

        return {
            content: [
                // Título de la factura
                { text: 'Factura Electrónica', style: 'header', alignment: 'center' },

                // Datos del Negocio en un recuadro
                {
                    style: 'tableExample',
                    table: {
                        widths: ['*'],
                        body: [
                            [
                                {
                                    text: [
                                        { text: 'Negocio: ', style: 'label' },
                                        facturaGenerada.nombreNegocio,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'CUIT: ', style: 'label' },
                                        facturaGenerada.cuit,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Punto de Venta: ', style: 'label' },
                                        facturaGenerada.puntoVenta,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Número de Factura: ', style: 'label' },
                                        facturaGenerada.numeroFactura,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Tipo de Factura: ', style: 'label' },
                                        'Factura Tipo C', // Indicar el tipo de factura
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Fecha de Emisión: ', style: 'label' },
                                        fechaProcesoFormateada,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'CAE: ', style: 'label' },
                                        facturaGenerada.cae,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Fecha de Vencimiento CAE: ', style: 'label' },
                                        fechaVencimientoFormateadaCAE,
                                    ],
                                },
                            ],
                        ],
                    },
                    layout: 'lightHorizontalLines', // Estilo del recuadro
                    margin: [0, 0, 0, 20], // Margen inferior
                },

                // Datos del Comprador en un recuadro
                {
                    style: 'tableExample',
                    table: {
                        widths: ['*'],
                        body: [
                            [
                                {
                                    text: [
                                        { text: 'Comprador: ', style: 'label' },
                                        ventaData.cliente_nombre_mp,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Correo Electrónico: ', style: 'label' },
                                        ventaData.identification.email,
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: `${ventaData.identification.type}: `, style: 'label' },
                                        ventaData.identification.number,
                                    ],
                                },
                            ],
                        ],
                    },
                    layout: 'lightHorizontalLines', // Estilo del recuadro
                    margin: [0, 0, 0, 20], // Margen inferior
                },

                // Detalles de la Compra
                { text: 'Detalle de la Compra', style: 'subheader', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Producto', style: 'tableHeader' },
                                { text: 'Cantidad', style: 'tableHeader' },
                                { text: 'Precio Unitario', style: 'tableHeader' },
                                { text: 'Subtotal', style: 'tableHeader' },
                            ],
                            ...items, // Lista de productos
                        ],
                    },
                    layout: 'lightHorizontalLines', // Estilo de la tabla
                    margin: [0, 0, 0, 20], // Margen inferior
                },

                // Totales (alineados a la derecha)
                {
                    columns: [
                        { text: '', width: '*' }, // Columna vacía para alinear a la derecha
                        {
                            width: 'auto',
                            text: [
                                { text: 'Costo de Envío: ', style: 'label' },
                                { text: `$${parseFloat(ventaData.costo_envio).toFixed(2)}`, style: 'value' },
                            ],
                        },
                    ],
                    margin: [0, 0, 0, 10], // Margen inferior
                },
                {
                    columns: [
                        { text: '', width: '*' }, // Columna vacía para alinear a la derecha
                        {
                            width: 'auto',
                            text: [
                                { text: 'Total sin Envío: ', style: 'label' },
                                { text: `$${parseFloat(ventaData.total_sin_envio).toFixed(2)}`, style: 'value' },
                            ],
                        },
                    ],
                    margin: [0, 0, 0, 10], // Margen inferior
                },
                {
                    columns: [
                        { text: '', width: '*' }, // Columna vacía para alinear a la derecha
                        {
                            width: 'auto',
                            text: [
                                { text: 'Importe Total: ', style: 'label' },
                                { text: `$${facturaGenerada.importeTotal.toFixed(2)}`, style: 'value' },
                            ],
                        },
                    ],
                    margin: [0, 0, 0, 20], // Margen inferior
                },
            ],
            styles: {
                header: {
                    fontSize: 24,
                    bold: true,
                    margin: [0, 0, 0, 20],
                    font: 'Roboto',
                    alignment: 'center',
                },
                subheader: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10],
                    font: 'Roboto',
                },
                label: {
                    fontSize: 12,
                    bold: true,
                    font: 'Roboto',
                },
                tipoFactura: { // Estilo personalizado para el tipo de factura
                    fontSize: 12,
                    bold: true,
                    color: '#2b8a3e', // Color verde para resaltar
                    font: 'Roboto',
                },
                value: {
                    fontSize: 12,
                    font: 'Roboto',
                },
                tableHeader: {
                    fontSize: 12,
                    bold: true,
                    fillColor: '#f0f0f0', // Color de fondo del encabezado de la tabla
                    font: 'Roboto',
                },
                tableExample: {
                    margin: [0, 5, 0, 15],
                },
            },
        };
    } catch (error) {
        console.error('Error al generar el documento PDF:', error);
        throw new Error('No se pudo generar el documento PDF. Verifica los datos proporcionados.');
    }
}

module.exports = { generarDocDefinition };