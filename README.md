Global Dispatch - Monitoreo Logístico en Tiempo Real

Sistema desarrollado en Node.js y Solace PubSub+ para conectar clientes y transportistas, validando solicitudes de transporte de manera automática según reglas de fecha y hora[cite: 1].

##  Reglas Principales
* El *pickup* no puede ser en el pasado.
* Pedidos del mismo día no se aceptan después de las 3:00 p.m.
* El *delivery* debe tener al menos un día de diferencia respecto al *pickup*.

## Ejecución (3 Terminales)
1. **Monitoreo de Clientes:** `node client-monitor.js`.
2. **Panel de Transportistas:** `node dashboard`.
3. **Validador de Órdenes:** `node validator.js`.
