const axios = require('axios');

const XANO_URL = process.env.XANO_SPORTSHAUSEN_URL;

const TIPOS_TICKET = [
  'Consulta sobre evento',
  'Problema con postulación',
  'Reporte de incidente',
  'Otro asunto'
];

const PRIORIDADES = ['BAJA', 'MEDIANA', 'ALTA', 'URGENTE'];

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

/**
 * LUCHADOR: Crear ticket
 * POST /api/tickets
 */
exports.crearTicket = async (req, res) => {
  try {
    const { tipo_solicitud, motivo, agrupacion_id, evento_id } = req.body;
    const luchador_id = req.user.id;

    if (!tipo_solicitud || !TIPOS_TICKET.includes(tipo_solicitud)) {
      return res.status(400).json({ error: 'Tipo de solicitud inválido' });
    }
    if (!motivo || motivo.trim().length < 10) {
      return res.status(400).json({ error: 'El motivo debe tener al menos 10 caracteres' });
    }
    if (!agrupacion_id) {
      return res.status(400).json({ error: 'Agrupación no especificada' });
    }

    const payload = {
      luchador_id,
      agrupacion_id,
      tipo_solicitud,
      motivo: motivo.trim(),
      estado: 'ABIERTO',
      prioridad: 'BAJA',
      evento_id: evento_id || null,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
    };

    const { data } = await axios.post(`${XANO_URL}/tickets`, payload, auth(req.token));
    res.status(201).json({ success: true, ticket: data, message: 'Ticket creado exitosamente' });

  } catch (error) {
    console.error('[crearTicket ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
};

/**
 * LUCHADOR: Ver mis tickets
 * GET /api/tickets/mis-tickets
 */
exports.misTickets = async (req, res) => {
  try {
    const { data } = await axios.get(`${XANO_URL}/tickets`, {
      params: { luchador_id: req.user.id },
      ...auth(req.token),
    });

    const tickets = Array.isArray(data) ? data : [];
    res.json({
      total: tickets.length,
      tickets: tickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)),
    });

  } catch (error) {
    console.error('[misTickets ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al cargar tickets' });
  }
};

/**
 * LUCHADOR: Enviar mensaje en un ticket
 * POST /api/tickets/:ticketId/mensaje
 */
exports.enviarMensajeLuchador = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { contenido } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    const { data } = await axios.post(`${XANO_URL}/ticket_mensajes`, {
      ticket_id: parseInt(ticketId),
      remitente: 'LUCHADOR',
      contenido: contenido.trim(),
      fecha_envio: new Date().toISOString(),
    }, auth(req.token));

    res.json({ success: true, mensaje: data });

  } catch (error) {
    console.error('[enviarMensajeLuchador ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

/**
 * AGRUPACION: Ver tickets asignados
 * GET /api/tickets/agrupacion/mis-solicitudes
 */
exports.ticketsAgrupacion = async (req, res) => {
  try {
    const { data } = await axios.get(`${XANO_URL}/tickets`, {
      params: { agrupacion_id: req.user.id },
      ...auth(req.token),
    });

    const tickets = Array.isArray(data) ? data : [];
    res.json({
      total: tickets.length,
      tickets: tickets.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)),
    });

  } catch (error) {
    console.error('[ticketsAgrupacion ERROR] status:', error.response?.status);
    console.error('[ticketsAgrupacion ERROR] data:', JSON.stringify(error.response?.data));
    console.error('[ticketsAgrupacion ERROR] msg:', error.message);
    res.status(500).json({ error: error.response?.data?.message || error.message });
  }
};

/**
 * AGRUPACION: Cambiar prioridad
 * PATCH /api/tickets/:ticketId/prioridad
 */
exports.cambiarPrioridad = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { prioridad } = req.body;

    if (!PRIORIDADES.includes(prioridad)) {
      return res.status(400).json({ error: 'Prioridad inválida' });
    }

    const { data } = await axios.patch(`${XANO_URL}/tickets/${ticketId}`, {
      prioridad,
      fecha_actualizacion: new Date().toISOString(),
    }, auth(req.token));

    res.json({ success: true, ticket: data });

  } catch (error) {
    console.error('[cambiarPrioridad ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al cambiar prioridad' });
  }
};

/**
 * AGRUPACION: Enviar mensaje
 * POST /api/tickets/:ticketId/mensaje-admin
 */
exports.enviarMensajeAgrupacion = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { contenido } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    await axios.post(`${XANO_URL}/ticket_mensajes`, {
      ticket_id: parseInt(ticketId),
      remitente: 'AGRUPACION',
      contenido: contenido.trim(),
      fecha_envio: new Date().toISOString(),
    }, auth(req.token));

    // Auto-cambiar estado a EN_PROCESO si está ABIERTO
    try {
      const { data: ticket } = await axios.get(`${XANO_URL}/tickets/${ticketId}`, auth(req.token));
      if (ticket.estado === 'ABIERTO') {
        await axios.patch(`${XANO_URL}/tickets/${ticketId}`, {
          estado: 'EN_PROCESO',
          fecha_actualizacion: new Date().toISOString(),
        }, auth(req.token));
      }
    } catch (_) {}

    res.json({ success: true, message: 'Mensaje enviado' });

  } catch (error) {
    console.error('[enviarMensajeAgrupacion ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

/**
 * AGRUPACION: Finalizar ticket
 * PATCH /api/tickets/:ticketId/finalizar
 */
exports.finalizarTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const { data } = await axios.patch(`${XANO_URL}/tickets/${ticketId}`, {
      estado: 'CERRADO',
      fecha_actualizacion: new Date().toISOString(),
    }, auth(req.token));

    res.json({ success: true, ticket: data });

  } catch (error) {
    console.error('[finalizarTicket ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al finalizar ticket' });
  }
};

/**
 * AMBOS: Obtener mensajes de un ticket
 * GET /api/tickets/:ticketId/mensajes
 */
exports.obtenerMensajes = async (req, res) => {
  try {
    const { data } = await axios.get(`${XANO_URL}/ticket_mensajes`, {
      params: { ticket_id: parseInt(req.params.ticketId) },
      ...auth(req.token),
    });

    const mensajes = Array.isArray(data) ? data : [];
    res.json({
      total: mensajes.length,
      mensajes: mensajes.sort((a, b) => new Date(a.fecha_envio) - new Date(b.fecha_envio)),
    });

  } catch (error) {
    console.error('[obtenerMensajes ERROR]', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al cargar mensajes' });
  }
};

module.exports = exports;
