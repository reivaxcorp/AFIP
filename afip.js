const { onCall } = require("firebase-functions/v2/https");
const { generarDocDefinition } = require('./facturaHelper');
const PdfPrinter = require('pdfmake');
const soap = require('soap');
const admin = require('firebase-admin');
const forge = require('node-forge');
const xml2js = require('xml2js'); // Necesitarás instalar xml2js si no lo has hecho
const bucket = admin.storage().bucket(); // Acceso a Firebase Storage, donde estan las credenciales

// Configuración
const CUIT = 99999999999;
const puntoVenta = 1; // tu punto de venta es 04566, pero en AFIP se usa sin el cero inicial

// Usas los certificados generados en,  https://www.afip.gob.ar/ws/
const certPath = 'certificados/testing-homologacion/MiCertificado.pem'; // Ruta en Firebase Storage
const keyPath = 'certificados/testing-homologacion/MiClavePrivada.key'; // Ruta en Firebase Storage
const nombreNegocio = 'Nombre de tu negocio';

// certificados de produccion
// const certPath = 'certificados/produccion/facturacionweb.pem'; // Ruta en Firebase Storage
// const keyPath = 'certificados/produccion/facturacionweb.key'; 

/**
 * Certificados de produccion.
 * 
 * En el menú de servicios, busca "Administración de Certificados Digitales".
 * Si no aparece, debes habilitarlo desde "Administrador de Relaciones de Clave Fiscal". Luego se debe subir un certificado
 * con el alias que tengamos, si ya disponemos de certificados en el Portal de AFIP.
 */


// URLs de AFIP Homologación (Testing)
const wsaaUrlHomo = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl';
const wsfeUrlHomo = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL';

// URLs de Producción
// const wsaaUrl = 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl'
// WSFE (Web Service de Facturación Electrónica)
// const wsfeUrl = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'

//  Función para leer archivos desde Firebase Storage
async function leerArchivoDesdeStorage(ruta) {
    console.log(`Intentando leer archivo desde Firebase Storage: ${ruta}`);

    try {
        const file = bucket.file(ruta);
        const [contenido] = await file.download();
        const contenidoTexto = contenido.toString('utf8');

        console.log(`Archivo leído correctamente: ${ruta} (tamaño: ${contenidoTexto.length} bytes) contenido: ${contenidoTexto}`);
        return contenidoTexto;
    } catch (error) {
        console.error(`Error al leer el archivo ${ruta}:`, error);
        throw error;
    }
}

// Función para obtener el Ticket de Acceso (TA)
async function obtenerTicketAcceso() {
    try {
        const traXml = generarTRA(); // Generar el TRA.xml
        const cms = await firmarTRA(traXml); // Firmar el TRA.xml
        const cmsBase64 = convertirCMSaBase64(cms); // Convertir el CMS a Base64

        // Limpiar el CMS Base64 (eliminar saltos de línea y espacios)
        const cmsBase64Clean = cmsBase64.replace(/\r?\n|\r/g, '');

        // Crear el cliente SOAP
        const client = await soap.createClientAsync(wsaaUrlHomo);
        console.log('Cliente SOAP creado correctamente');

        // Enviar la solicitud al WSAA
        const response = await client.loginCmsAsync({ in0: cmsBase64Clean });
        console.log('Respuesta del WSAA:', response);

        // Extraer el token y la firma
        const xmlResponse = response[0].loginCmsReturn;
        const parsedXml = await parseXml(xmlResponse);
        const token = parsedXml['loginTicketResponse']['credentials'][0]['token'][0];
        const sign = parsedXml['loginTicketResponse']['credentials'][0]['sign'][0];

        return { token, sign };
    } catch (error) {
        console.error('Error al obtener el Ticket de Acceso:', error);
        throw error;
    }
}


// Función para firmar el TRA.xml
async function firmarTRA(traXml) {
    const cert = await leerArchivoDesdeStorage(certPath); // Leer el certificado
    const key = await leerArchivoDesdeStorage(keyPath); // Leer la clave privada

    const pki = forge.pki;
    const certificado = pki.certificateFromPem(cert);
    const clavePrivada = pki.privateKeyFromPem(key);

    const cms = forge.pkcs7.createSignedData();
    cms.content = forge.util.createBuffer(traXml, 'utf8');
    cms.addCertificate(certificado);
    cms.addSigner({
        key: clavePrivada,
        certificate: certificado,
        digestAlgorithm: forge.pki.oids.sha256,
    });
    cms.sign();

    return forge.asn1.toDer(cms.toAsn1()).getBytes();
}

// Función para convertir el CMS a Base64
function convertirCMSaBase64(cms) {
    return Buffer.from(cms, 'binary').toString('base64');
}

// Función para generar el TRA.xml
// si hacemos otra consulta, puede que nos lanze el error
// "Ya posee un TRA VALIDO, bajar la fecha de vencimiento del TRA."
function generarTRA() {
    const minutos = 10; //AFIP recomienda un tiempo de vida de 10 minutos para el TRA. Este valor es suficiente para la mayoría de los casos y evita problemas de expiración.
    const uniqueId = Math.floor(Math.random() * 1000000); // ID único
    const generationTime = new Date().toISOString(); // Fecha de generación
    const expirationTime = new Date(Date.now() + minutos * 60 * 1000).toISOString(); // Fecha de expiración (10 minutos)

    const traXml = `<?xml version="1.0" encoding="UTF-8"?>
  <loginTicketRequest version="1.0">
    <header>
      <uniqueId>${uniqueId}</uniqueId>
      <generationTime>${generationTime}</generationTime>
      <expirationTime>${expirationTime}</expirationTime>
    </header>
    <service>wsfe</service>
  </loginTicketRequest>`;

    return traXml;
}

/**
 * 
 * // Ejemplo de parseado
    "Observaciones": {
        "Obs": [
            {
                "Code": ["10242"],
                "Msg": ["El campo Condicion IVA receptor no es un valor valido. Consular metodo FEParamGetCondicionIvaReceptor"]
            }
        ]
    }
} 
 */
function parseXml(xml) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function parseXmlResponse(xml) {
    return new Promise((resolve, reject) => {
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        parser.parseString(xml, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Función para generar la factura (EXPORTADA COMO API)
exports.generarFactura = onCall(async (request) => {
    try {

        ///////////////////////// AUTENTIFICACION 
        // Validar autenticación
        if (!request.auth) {
            return { error: 'Usuario no autenticado.', code: 'UNAUTHENTICATED' };
        }
        const isAdmin = request.auth.token.admin;
        if (!isAdmin) {
            return { error: 'Solo un administrador puede generar factura', code: 'PERMISSION_DENIED' };
        }
        const { uidUser, idCompra } = request.data;
        if (!uidUser || !idCompra) {
            return res.status(400).send({ error: 'Datos insuficientes en la solicitud.' });
        }
        /////////////////////////

        ///////////////////////// DATOS PARA LA FACTURA
        const ventaRef = admin.firestore().collection('ventas').doc(idCompra);
        const ventaDoc = await ventaRef.get();
        if (!ventaDoc.exists) {
            return { error: 'La venta no existe.', code: 'NOT_FOUND', details: { idCompra } };
        }
        const ventaData = ventaDoc.data();
        // Convertir los valores a números de punto flotante
        const costoEnvio = parseFloat(ventaData.costo_envio);
        const totalSinEnvio = parseFloat(ventaData.total_sin_envio);
        // Sumar los valores y redondear a 2 decimales
        const importeTotal = parseFloat((costoEnvio + totalSinEnvio).toFixed(2));
        /////////////////////////

        ///////////////////////// ARCA /////////////////////////
        const ta = await obtenerTicketAcceso();
        console.log('🔑 Ticket de Acceso:', ta); // Verificar qué devuelve
        const wsfeClient = await soap.createClientAsync(wsfeUrlHomo);
        const auth = {
            Token: ta.token,
            Sign: ta.sign,
            Cuit: CUIT,
        };
        console.log('📝 Autenticación enviada:', auth); // Verificar valores

        // Obtener el último número de comprobante autorizado
        const ultimoNumeroResponse = await wsfeClient.FECompUltimoAutorizadoAsync({
            Auth: auth, // Token de autenticación
            PtoVta: puntoVenta, // Punto de venta
            CbteTipo: 11, // Tipo de comprobante (Factura C)
        });

        const ultimoNumero = ultimoNumeroResponse[0].FECompUltimoAutorizadoResult.CbteNro;
        const proximoNumero = ultimoNumero + 1; // El próximo número de factura

        console.log("Ultimo Numero factura ", ultimoNumero);
        console.log("Proximo Numero factura ", proximoNumero);

        //const ivaResponse = await wsfeClient.FEParamGetTiposIvaAsync({ Auth: auth });
        //console.log('Tipos de IVA:', ivaResponse);

        // const condicionesIvaResponse = await wsfeClient.FEParamGetCondicionIvaReceptorAsync({ Auth: auth });
        // console.log('Condiciones IVA del Receptor:', condicionesIvaResponse);

        // Completar los datos de la factura
        // ver manual "manual-desarrollador-ARCA-COMPG-v4-0.pdf"
        // No es necesario para monotributista informar el IVA
        const facturaData = {
            FeCAEReq: {
                FeCabReq: {
                    CantReg: 1,
                    PtoVta: puntoVenta, // tu punto de venta es 04566, pero en AFIP se usa sin el cero inicial
                    CbteTipo: 11,
                },
                FeDetReq: {
                    FECAEDetRequest: {
                        Concepto: 1,
                        DocTipo: 99,
                        DocNro: 0,
                        CbteDesde: proximoNumero,
                        CbteHasta: proximoNumero,
                        CbteFch: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                        ImpTotal: importeTotal,
                        ImpTotConc: 0.0,
                        ImpNeto: importeTotal,
                        ImpOpEx: 0.0,
                        ImpIVA: 0.0,
                        ImpTrib: 0.0,
                        MonId: 'PES',
                        MonCotiz: 1.0,
                        CondicionIVAReceptorId: 5,
                    },
                },
            },
        };

        // Generar la factura, 
        // devuelve un array de 3, {FECAESolicitarResponse, header, FECAEDetRequest}
        const facturaResponse = await wsfeClient.FECAESolicitarAsync({
            Auth: auth,
            FeCAEReq: facturaData.FeCAEReq,
        });
        ///////////////////////// FIN ARCA  /////////////////////////


        // Verifica si la respuesta es un array y extrae el XML crudo
        const xmlResponse = Array.isArray(facturaResponse) ? facturaResponse[1] : facturaResponse;
        console.log("Respuesta cruda de la API:", facturaResponse);
        const parsedXmlfacturaResponse = await parseXmlResponse(xmlResponse);
        console.log("xml facturaResponse parseado ", parsedXmlfacturaResponse);



        // Verifica si hay observaciones de error
        const resultado = parsedXmlfacturaResponse['soap:Envelope']?.['soap:Body']?.FECAESolicitarResponse?.FECAESolicitarResult?.FeCabResp?.Resultado?.[0];
        const cae = parsedXmlfacturaResponse['soap:Envelope']?.['soap:Body']?.FECAESolicitarResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CAE;
        const caeFchVto = parsedXmlfacturaResponse['soap:Envelope']?.['soap:Body']?.FECAESolicitarResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CAEFchVto;
        // console.log("resultado " + resultado);
        // console.log("cae " + cae);
        // console.log("caeFchVto " + caeFchVto);

        //  A=APROBADO, R=RECHAZADO
        if (resultado === 'A') {
            // console.log('Factura aprobada.');
            // console.log('CAE:', cae);
            // console.log('Fecha de vencimiento del CAE:', caeFchVto);
            agregarFacturaEnDocumentoVenta(ventaRef, parsedXmlfacturaResponse, ventaData);

            return { message: 'Factura generada exitosamente.', code: 'SUCCESS', details: `Código de Autorización Electrónica CAE: ${cae} Vencimiento: ${caeFchVto}` };
        } else {
            console.log('Factura rechazada.');
            return {
                error: 'Error al generar la factura.',
                code: errorCode || 'INTERNAL',
                details: errorMsg || 'Error desconocido',
            };
        }
    } catch (error) {

        if (error.toString().includes('ns1:coe.alreadyAuthenticated')) {
            return {
                error: 'Error al generar la factura.',
                code: 'TA_VALIDO',
                details: 'Ya existe un Ticket de Acceso (TA) válido. Por favor, espera al menos 10 minutos antes de intentar nuevamente.',
            };
        } else {
            return {
                error: 'Error al generar la factura.',
                code: 'INTERNAL',
                details: error?.message || error?.toString() || 'Error desconocido',
            };
        }
    }
});

// actualizar documento venta en firebase
async function agregarFacturaEnDocumentoVenta(ventaRef, parsedXmlfacturaResponse, ventaData) {
    try {
        // Obtener el PDF en base64
        const facturaBase64 = await obtenerPDFBase64(
            parsedXmlfacturaResponse['soap:Envelope']?.['soap:Body']?.FECAESolicitarResponse,
            ventaData
        );

        // Convertir el base64 a un buffer
        const buffer = Buffer.from(facturaBase64, 'base64');

        // Generar un nombre único para el archivo
        const idCompra = ventaData.idCompra; // Asume que tienes un ID de compra en ventaData
        const fileName = `facturas/factura_${idCompra}.pdf`;

        // Subir el archivo a Firebase Storage
        const file = bucket.file(fileName);
        await file.save(buffer, {
            metadata: { contentType: 'application/pdf' },
        });

        // Hacer el archivo público y obtener el enlace
        await file.makePublic();
        const linkPublico = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        // Actualizar el documento de venta con el enlace público
        const updates = {
            link_factura: linkPublico,
        };
        await ventaRef.update(updates);

        console.log('Factura subida y enlace guardado correctamente:', linkPublico);
    } catch (error) {
        console.error('Error al subir la factura a Firebase Storage:', error);
        throw new Error('No se pudo subir la factura a Firebase Storage.');
    }
}

function obtenerPDFBase64(facturaResponse, ventaData) {
    return new Promise((resolve, reject) => {
        // Datos de la factura generada
        const facturaGenerada = {
            nombreNegocio: nombreNegocio,
            cuit: facturaResponse?.FECAESolicitarResult?.FeCabResp?.Cuit,
            puntoVenta: facturaResponse?.FECAESolicitarResult?.FeCabResp?.PtoVta,
            cae: facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CAE,
            caeFchVto: facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CAEFchVto,
            numeroFactura: facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CbteDesde,
            fechaEmision: facturaResponse?.FECAESolicitarResult?.FeCabResp?.FchProceso, // Fecha formateada
            importeTotal: parseFloat(ventaData.costo_envio) + parseFloat(ventaData.total_sin_envio), // Total con envío
            estado: 'Aprobada',
        };


        // Logs para depuración
        /*  console.log("facturaResponse completo:", JSON.stringify(facturaResponse, null, 2));
          console.log("FECAESolicitarResult:", JSON.stringify(facturaResponse?.FECAESolicitarResult, null, 2));
          console.log("FeCabResp:", JSON.stringify(facturaResponse?.FECAESolicitarResult?.FeCabResp, null, 2));
          console.log("FeDetResp:", JSON.stringify(facturaResponse?.FECAESolicitarResult?.FeDetResp, null, 2));
          console.log("FECAEDetResponse:", JSON.stringify(facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse, null, 2));
  
          // Logs de los campos específicos
          console.log("Cuit:", facturaResponse?.FECAESolicitarResult?.FeCabResp?.Cuit);
          console.log("PtoVta:", facturaResponse?.FECAESolicitarResult?.FeCabResp?.PtoVta);
          console.log("CAE:", facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CAE);
          console.log("CAEFchVto:", facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CAEFchVto);
          console.log("CbteDesde:", facturaResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse?.CbteDesde);
          */

        // Fuentes para el PDF
        const fonts = {
            Roboto: {
                normal: __dirname + '/fonts/Roboto-Regular.ttf', // Ruta a la fuente normal
                bold: __dirname + '/fonts/Roboto-Bold.ttf',      // Ruta a la fuente bold
                italics: __dirname + '/fonts/Roboto-Italic.ttf', // Ruta a la fuente italic
                bolditalics: __dirname + '/fonts/Roboto-BoldItalic.ttf', // Ruta a la fuente bold-italic
            },
        };

        const printer = new PdfPrinter(fonts);

        // Detalles de los productos
        const items = ventaData.additional_info.items.map((item) => [
            item.title, // Nombre del producto
            item.quantity, // Cantidad
            `$${parseFloat(item.unit_price).toFixed(2)}`, // Precio unitario
            `$${(parseFloat(item.unit_price) * parseFloat(item.quantity)).toFixed(2)}`, // Subtotal
        ]);

        // Contenido del PDF
        // Generar el docDefinition usando el método separado
        const docDefinition = generarDocDefinition(facturaGenerada, ventaData, items);

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];

        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            const pdfBase64 = pdfBuffer.toString('base64');
            console.log('PDF generado en Base64:', pdfBase64);
            resolve(pdfBase64); // Resuelve la promesa con el PDF en Base64
        });

        pdfDoc.on('error', (error) => {
            reject(error); // Rechaza la promesa si hay un error
        });

        pdfDoc.end();
    });
}
