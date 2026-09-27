const { createSession } = require('./solace-client');
const solace = require('solclientjs');

const session = createSession();

session.on(solace.SessionEventCode.UP_NOTICE, () => {
    console.log("=========================================");
    console.log("===     DASHBOARD DE TRANSPORTISTAS     ===");
    console.log("=========================================");
    console.log("Esperando cargas nuevas...\n");

    try {
        const consumer = session.createMessageConsumer({
            queueDescriptor: new solace.QueueDescriptor({
                type: solace.QueueType.QUEUE,
                name: 'orders/valid'
            }),
            // Nombre de la constante corregido
            acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT
        });

        // 1. Escuchar mensajes entrantes
        consumer.on(solace.MessageConsumerEventName.MESSAGE, (msg) => {
            try {
                const order = JSON.parse(msg.getBinaryAttachment());
                
                console.log(`🚚 NUEVA CARGA | ID: ${order.shipperOrderId} | Precio: $${order.price}`);
                console.log(`📍 Ruta: ${order.stops[0].city} ➡️ ${order.stops[1].city}`);
                console.log(`📅 Pickup: ${order.pickupDate} | Entrega: ${order.deliveryDate}\n`);
                console.log("-----------------------------------------");
                
                msg.acknowledge(); // Confirma la lectura y elimina la carga de Solace Cloud
            } catch (e) {
                console.error("Error al procesar el mensaje:", e.message);
            }
        });

        // 2. Evento cuando el consumidor se amarra con éxito a la cola
        consumer.on(solace.MessageConsumerEventName.UP, () => {
            console.log(">>> Dashboard conectado exitosamente a la cola. Escuchando eventos... <<<\n");
        });

        // 3. Control de errores
        consumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, (error) => {
            console.error("❌ Fallo de conexión en la cola:", error ? error.infoStr : "Error desconocido");
        });

        consumer.on(solace.MessageConsumerEventName.DOWN, (reason) => {
            console.error("⚠️ El consumidor se desconectó de la cola:", reason ? reason.infoStr : "");
        });

        // Conectar el consumidor a la cola
        consumer.connect();

    } catch (error) {
        console.error("Error crítico al crear el consumidor:", error);
    }
});

session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
    console.error("Error al conectar con Solace:", sessionEvent.infoStr);
});

session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
    console.log("Dashboard desconectado.", sessionEvent.infoStr);
});

session.connect();