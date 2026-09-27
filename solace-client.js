require('dotenv').config();
const solace = require('solclientjs');

const factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

function createSession() {
    return solace.SolclientFactory.createSession({
        url: process.env.SOLACE_HOST,
        vpnName: process.env.SOLACE_VPN,
        userName: process.env.SOLACE_USERNAME,
        password: process.env.SOLACE_PASSWORD
    });
}

function publishMessage(session, destinationName, payload) {
    if (!session) {
        console.warn('No hay sesión activa para publicar.');
        return;
    }

    try {
        const msg = solace.SolclientFactory.createMessage();
        
        // CORRECCIÓN: Usamos createTopicDestination
        const dest = solace.SolclientFactory.createTopicDestination(destinationName);
        
        msg.setDestination(dest);
        msg.setBinaryAttachment(JSON.stringify(payload));
        msg.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
        
        session.send(msg);
    } catch (error) {
        console.error(`Error al publicar mensaje: ${error.message}`);
    }
}

module.exports = { createSession, publishMessage, solace };