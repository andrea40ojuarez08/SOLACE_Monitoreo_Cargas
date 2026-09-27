const { createSession, publishMessage, solace } = require('./solace-client');

function validarPayload(order) {
    const hoy = new Date();
    const fechaHoyStr = hoy.toISOString().split('T')[0];
    const pickup = order.pickupDate;
    const delivery = order.deliveryDate;

    // Validación 1: El pickup no puede ser en el pasado
    if (pickup < fechaHoyStr) {
        return { valido: false, nota: "Pickup date cannot be earlier than the current date." };
    }

    // Validación 2: Los pedidos para el mismo día tienen hora límite
    if (pickup === fechaHoyStr && hoy.getHours() >= 15) {
        return { valido: false, nota: "Orders for same-day pickup cannot be received after 3:00 p.m." };
    }

    // Validación 3: Debe haber al menos 1 día entre pickup y delivery
    const diffDias = (new Date(delivery) - new Date(pickup)) / (1000 * 60 * 60 * 24);
    if (diffDias < 1) {
        return { valido: false, nota: "Delivery date must be at least 1 day after pickup." };
    }

    return { valido: true };
}

function procesarOrden(session, payload) {
    const validacion = validarPayload(payload);
    
    if (validacion.valido) {
        // Enviar a la cola de cargas válidas (para el dashboard de transportistas)
        publishMessage(session, 'orders/valid', payload);
        
        // Actualizar el estado de la orden
        publishMessage(session, 'orders/status', {
            shipperOrderId: payload.shipperOrderId,
            status: "Accepted",
            notes: "You will receive an email when a carrier accepts this dispatch request"
        });
        console.log(`[OK] Orden ${payload.shipperOrderId} procesada.`);
    } else {
        // Actualizar el estado indicando el rechazo
        publishMessage(session, 'orders/status', {
            shipperOrderId: payload.shipperOrderId,
            status: "Cancelled",
            notes: validacion.nota
        });
        console.log(`[RECHAZO] Orden ${payload.shipperOrderId}: ${validacion.nota}`);
    }
}

const session = createSession();

session.on(solace.SessionEventCode.UP_NOTICE, () => {
    console.log("Validador conectado. Procesando pruebas...\n");

    // Payload de prueba 1: VÁLIDO
    procesarOrden(session, {
        shipperOrderId: "6600111323",
        pickupDate: "2026-09-30",
        deliveryDate: "2026-10-02",
        price: 900,
        stops: [{ city: "Milford" }, { city: "Shippensburg" }],
        vehicles: [{ year: "2010", make: "Toyota", model: "Corolla" }]
    });

    // Payload de prueba 2: INVÁLIDO (Fecha antigua)
    procesarOrden(session, {
        shipperOrderId: "7743789",
        pickupDate: "2020-01-01",
        deliveryDate: "2020-01-02",
        price: 900,
        stops: [{ city: "A" }, { city: "B" }],
        vehicles: [{ make: "Ford" }]
    });

    // IMPORTANTE: Damos un respiro de 2 segundos para asegurar que Solace despache los mensajes
    setTimeout(() => {
        console.log("\nProceso de envío finalizado. Desconectando validador...");
        session.disconnect();
    }, 2000);
});

// Eventos de control de conexión
session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
    console.error("Error al conectar con Solace:", sessionEvent.infoStr);
});

session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
    console.log("Validador desconectado.", sessionEvent.infoStr);
});

// Iniciar la conexión al broker
session.connect();