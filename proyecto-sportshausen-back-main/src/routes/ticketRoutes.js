const express = require('express');
const { softProtect, requireRole } = require('../middlewares/authMiddleware');
const {
  crearTicket,
  misTickets,
  enviarMensajeLuchador,
  ticketsAgrupacion,
  cambiarPrioridad,
  enviarMensajeAgrupacion,
  finalizarTicket,
  obtenerMensajes
} = require('../controller/ticketControllers');

const router = express.Router();

// ======================
// LUCHADOR endpoints
// ======================

// Crear ticket
router.post('/',
  softProtect,
  requireRole('luchador'),
  crearTicket
);

// Ver mis tickets
router.get('/mis-tickets',
  softProtect,
  requireRole('luchador'),
  misTickets
);

// Enviar mensaje en ticket (luchador)
router.post('/:ticketId/mensaje',
  softProtect,
  requireRole('luchador'),
  enviarMensajeLuchador
);

// ======================
// AGRUPACION endpoints
// ======================

// Ver mis solicitudes (agrupación)
router.get('/agrupacion/mis-solicitudes',
  softProtect,
  requireRole('agrupacion'),
  ticketsAgrupacion
);

// Cambiar prioridad
router.patch('/:ticketId/prioridad',
  softProtect,
  requireRole('agrupacion'),
  cambiarPrioridad
);

// Enviar mensaje (agrupación)
router.post('/:ticketId/mensaje-admin',
  softProtect,
  requireRole('agrupacion'),
  enviarMensajeAgrupacion
);

// Finalizar ticket
router.patch('/:ticketId/finalizar',
  softProtect,
  requireRole('agrupacion'),
  finalizarTicket
);

// ======================
// AMBOS endpoints
// ======================

// Obtener mensajes
router.get('/:ticketId/mensajes',
  softProtect,
  obtenerMensajes
);

module.exports = router;
