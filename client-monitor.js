const { createSession } = require('./solace-client');
const solace = require('solclientjs');

const session = createSession();

session.on(solace.SessionEventCode.UP_NOTICE, () => {
    console.log("=========================================");
    console.log("===       ESTADOS DEL CLIENTE         ===");
    console.log("=========================================");
    console.log("Escuchando eventos de estado...\n");

    try {
        const consumer = session.createMessageConsumer({
            queueDescriptor: new solace.QueueDescriptor({
                type: solace.QueueType.QUEUE,
                name: 'orders/status'
            }),
            acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT
        });

        // 1. Escuchar actualizaciones de estado
        consumer.on(solace.MessageConsumerEventName.MESSAGE, (msg) => {
            try {
                const statusData = JSON.parse(msg.getBinaryAttachment());
                
                console.log(`🟢 [ACTUALIZACIÓN DE ESTADO]`);
                console.log(`📦 Orden ID: ${statusData.shipperOrderId || statusData.id || 'N/A'}`);
                console.log(`📌 Estado: ${statusData.status || 'PROCESADO'}`);
                console.log("-----------------------------------------");
                
                msg.acknowledge(); // Liberar mensaje de la cola
            } catch (e) {
                console.error("Error al procesar el mensaje de estado:", e.message);
            }
        });

        // 2. Confirmación de conexión a la cola
        consumer.on(solace.MessageConsumerEventName.UP, () => {
            console.log(">>> Monitor conectado exitosamente a 'orders/status'. Esperando eventos... <<<\n");
        });

        // 3. Captura de errores
        consumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, (error) => {
            console.error("❌ Fallo de conexión en la cola de estado:", error ? error.infoStr : "Error desconocido");
        });

        consumer.on(solace.MessageConsumerEventName.DOWN, (reason) => {
            console.error("⚠️ El monitor se desconectó de la cola:", reason ? reason.infoStr : "");
        });

        consumer.connect();

    } catch (error) {
        console.error("Error crítico en el monitor de clientes:", error);
    }
});

session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
    console.error("Error al conectar con Solace:", sessionEvent.infoStr);
});

session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
    console.log("Monitor desconectado.", sessionEvent.infoStr);
});

session.connect();