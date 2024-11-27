// For help writing plugins, visit the documentation to get started:
//   https://docs.insomnia.rest/insomnia/introduction-to-plugins
const jose = require('node-jose');

const firmar = async (context, body) => {
   try {
      const privateKey = context.request.getEnvironmentVariable('PRIVATE_KEY_JWS');
      const kid = context.request.getEnvironmentVariable('KID_JWS');
      if (!privateKey) {
        console.log('----------------------------------------------------------------');
        console.log('ES NECESARIO CONFIGURAR LA VARIABLE DE ENTORNO (PRIVATE_KEY_JWS)');
        console.log('----------------------------------------------------------------');
        return;
      }
      const keyStore = jose.JWK.createKeyStore();
      const key = await keyStore.add(privateKey, 'pem');
      console.log('Clave cargada correctamente:', key.toJSON(true));
      
      const payloadString = JSON.stringify(body);
      
      const properties = {
        format: 'flattened'
      }
      if (kid) {
        properties.fields = {
          kid
        };
      }

      const signer = jose.JWS.createSign(
        properties,
        key
      );
      const jws = await signer.update(payloadString, 'utf8').final();

      console.log('JWS en formato deserializado:', jws);
      return jws;
   } catch (error) {
      console.error('Error', error); 
   }
}
module.exports = {
    name: 'jws-sign-decode', // Nombre del plugin
    displayName: 'JwsSignDecode', // Nombre visible en la interfaz de Insomnia
    description: 'Plugin para firmar un request y decodificar el response haciendo uso de jws deserializado',

  // Añadir una nueva transformación para respuestas
  requestHooks: [
    async (context) => {
      try {
        console.log('Procesando respuesta...');
        const bodyBuffer = await context.request.getBody();
        const body = bodyBuffer ? bodyBuffer.text : '';

        const jws = await firmar(context, JSON.parse(body));
        await context.request.setBodyText(JSON.stringify(jws));
      } catch(error) {
        console.log(error);
      }
    },
  ],
  responseHooks: [
    async (context) => {
      const bodyBuffer = await context.response.getBody();
      
      try {
        // Convertir el cuerpo en un objeto JSON
        const parsedBody = JSON.parse(bodyBuffer);

        // Revisar si el campo base64 está presente y es una cadena base64
        if (parsedBody.payload && typeof parsedBody.payload === 'string') {
          console.log('Campo Base64 encontrado:', parsedBody.payload);

          const decodedValue = Buffer.from(parsedBody.payload, 'base64').toString('utf-8');
          console.log('Valor decodificado:', decodedValue);

          // Reemplazar el campo en el cuerpo con el valor decodificado
          parsedBody.decodificado = JSON.parse(decodedValue);

          // Actualizar el cuerpo de la respuesta con el campo decodificado
          const modifiedBody = JSON.stringify(parsedBody);
          await context.response.setBody(modifiedBody);

          console.log('Cuerpo modificado:', modifiedBody);
        } else {
          console.log('No se encontró el campo base64 en la respuesta');
        }
      } catch (error) {
        console.error('Error al procesar el cuerpo de la respuesta:', error);
      }
    }
  ]
};