# **Implementación de la API de AFIP (ARCA) con Node.js y Firebase Functions**
# Ejemplo de generación de facturas tipo C, puede adaptarse a tus necesidades leyendo la documentación

Este proyecto es una implementación de la API de **AFIP (ARCA)** para la generación de facturas electrónicas en Argentina. Utiliza **Firebase** como backend y **Firebase Functions** para ejecutar la lógica del servidor. Además, se integra con **Firebase Storage** para almacenar las facturas generadas y **Firestore** para gestionar los datos de las ventas.

---

## **Tecnologías Utilizadas**
- **Node.js**: Entorno de ejecución para JavaScript en el servidor.
- **Firebase**: Plataforma de desarrollo de aplicaciones que proporciona servicios como Firestore, Firebase Storage y Firebase Functions.
- **Firebase Functions**: Servidor sin servidor (serverless) para ejecutar código en la nube.
- **Firestore**: Base de datos NoSQL en tiempo real para almacenar datos de ventas y facturas.
- **Firebase Storage**: Almacenamiento en la nube para guardar archivos, como las facturas en formato PDF.
- **Node.js**: Entorno de ejecución para JavaScript en el servidor.
- **SOAP**: Protocolo para comunicarse con los servicios web de AFIP (ARCA).
- **PDFMake**: Librería para generar archivos PDF en formato base64.
- **xml2js**: Librería para parsear XML a JSON.
- **node-forge**: Librería para manejar certificados y firmas digitales.

---

## **Descripción del Proyecto**

El proyecto permite generar facturas electrónicas utilizando la API de **AFIP (ARCA)**. Las facturas son generadas en formato PDF y almacenadas en Firebase Storage. Además, se actualiza el documento de venta en Firestore con un enlace público a la factura generada.

### **Flujo de Trabajo**

1. **Autenticación con AFIP (ARCA)**:
   - Se utiliza un certificado digital y una clave privada para autenticarse con el servicio de AFIP.
   - Se genera un **Ticket de Acceso (TA)** que permite realizar operaciones en la API.

2. **Generación de Factura**:
   - Se obtienen los datos de la venta desde Firestore.
   - Se realiza una solicitud a la API de AFIP (ARCA) para generar la factura electrónica.
   - Se recibe un **Código de Autorización Electrónica (CAE)** que valida la factura.

3. **Generación del PDF**:
   - Se utiliza la librería **PDFMake** para generar un archivo PDF con los detalles de la factura.
   - El PDF se convierte a formato base64 para su almacenamiento.

4. **Almacenamiento en Firebase Storage**:
   - El archivo PDF se sube a Firebase Storage en la carpeta `facturas`.
   - Se genera un enlace público para descargar la factura.

5. **Actualización de Firestore**:
   - El enlace público de la factura se guarda en el documento de venta correspondiente en Firestore.

---

## **Estructura del Proyecto**

### **Archivos Principales**

1. **`afip.js`**:
   - Contiene la lógica principal para interactuar con la API de AFIP (ARCA).
   - Incluye funciones para:
     - Obtener el Ticket de Acceso (TA).
     - Generar la factura electrónica.
     - Subir la factura a Firebase Storage.
     - Actualizar Firestore con el enlace de la factura.

2. **`facturaHelper.js`**:
   - Contiene funciones auxiliares para generar el contenido del PDF utilizando **PDFMake**.

3. **Certificados**:
   - Los certificados digitales y la clave privada se almacenan en Firebase Storage para su uso en la autenticación con AFIP.

---

## **Configuración del Proyecto**

### **Requisitos Previos**

1. **Certificados AFIP (ARCA)**:
   - Obtener un certificado digital y una clave privada desde el portal de AFIP.
   - Subir los archivos `.pem` y `.key` a Firebase Storage.

2. **Configuración de Firebase**:
   - Crear un proyecto en Firebase.
   - Habilitar Firestore, Firebase Storage y Firebase Functions.
   - Configurar las credenciales de Firebase en el proyecto.

3. **Dependencias**:
   - Instalar las dependencias necesarias:
     ```bash
     npm install firebase-functions firebase-admin soap xml2js node-forge pdfmake
     ```

---

## **Ejemplo de Uso**

### **Generar una Factura**

1. **Solicitud**:
   - Realizar una solicitud a la función `generarFactura` con los datos de la venta (`uidUser` e `idCompra`).

2. **Respuesta**:
   - Si la factura es generada correctamente, se devuelve un mensaje de éxito con el **CAE** y la fecha de vencimiento.
   - El enlace de la factura se almacena en el documento de venta en Firestore.

### **Eliminar una Venta**

1. **Solicitud**:
   - Realizar una solicitud a la función `borrarVenta` con el `idCompra`.
   - La función elimina la venta de Firestore y la factura asociada de Firebase Storage.

---

## **Consideraciones Importantes**

- **Certificados de Producción**: Para usar el sistema en producción, es necesario obtener certificados válidos desde el portal de AFIP.
- **Tiempo de Vida del TA**: El Ticket de Acceso (TA) tiene un tiempo de vida limitado (10 minutos). Si se intenta generar una factura con un TA expirado, se debe generar uno nuevo.
- **Errores Comunes**:
  - **TA Válido**: Si ya existe un TA válido, se debe esperar a que expire antes de generar uno nuevo.
  - **Datos Inválidos**: Verificar que los datos de la venta y del cliente sean correctos antes de generar la factura.

---

## **Contribuciones**

Este proyecto es de código abierto y está disponible en GitHub. Si deseas contribuir, puedes:

- Reportar problemas (issues).
- Proponer mejoras (pull requests).
- Compartir tus experiencias y sugerencias.

---

## **Licencia**

Este proyecto está bajo la licencia **MIT**. Puedes usarlo, modificarlo y distribuirlo libremente.

---

## **Enlaces Útiles**

- [Documentación Oficial de AFIP (ARCA)](https://www.afip.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf)
- [Firebase Documentation](https://firebase.google.com/docs/)
- [PDFMake Documentation](https://pdfmake.github.io/docs/)

---

### **Autor**

## Conéctate Conmigo

Si tienes alguna pregunta, comentario o sugerencia, no dudes en ponerte en contacto:

- Correo electrónico: [reivaxcorp@email.com](mailto:reivaxcorp@gmail.com)
- LinkedIn: [Javier Monzón](https://www.linkedin.com/in/javier-monzón-a527952b5)
- YouTube: [ReivaxCorp.](https://www.youtube.com/channel/UCFaeV4z3zCTvF48ay6q7MtQ)
- Lista de Reproducción: [Aplicación CRUD en Unity 3D, utilizando Firebase.](https://www.youtube.com/playlist?list=PLsvltDspdJcfiiWy2baA2MCNzBm32USjv)
- Google Play: [ReivaxCorp](https://play.google.com/store/apps/dev?id=6165909766232622777)
- Sitio Web: [reivaxcorp.com](https://reivaxcorp.com)

 ¡Saludos!,
 Javier.


---

¡Gracias por tu interés en este proyecto! Si tienes alguna pregunta o sugerencia, no dudes en contactarme.
