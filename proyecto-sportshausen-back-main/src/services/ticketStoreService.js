/**
 * Almacén local de tickets en JSON.
 * Funciona igual que userMapService — persiste en disco entre reinicios.
 */

const fs   = require('fs');
const path = require('path');

const STORE_PATH     = path.join(__dirname, '../../data/tickets.json');
const MENSAJES_PATH  = path.join(__dirname, '../../data/ticket_mensajes.json');

// ── helpers de persistencia ──────────────────────────────────────────────────

const ensureDir = () => {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const readJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// ── auto-incremento ───────────────────────────────────────────────────────────

let _nextTicketId   = null;
let _nextMensajeId  = null;

const nextTicketId = () => {
  if (_nextTicketId === null) {
    const tickets = readJSON(STORE_PATH);
    _nextTicketId = tickets.length ? Math.max(...tickets.map(t => t.id)) + 1 : 1;
  }
  return _nextTicketId++;
};

const nextMensajeId = () => {
  if (_nextMensajeId === null) {
    const mensajes = readJSON(MENSAJES_PATH);
    _nextMensajeId = mensajes.length ? Math.max(...mensajes.map(m => m.id)) + 1 : 1;
  }
  return _nextMensajeId++;
};

// ── TICKETS ───────────────────────────────────────────────────────────────────

const crearTicket = (data) => {
  const tickets = readJSON(STORE_PATH);
  const ticket = { id: nextTicketId(), ...data };
  tickets.push(ticket);
  writeJSON(STORE_PATH, tickets);
  return ticket;
};

const getTicketsByLuchador = (luchador_id) => {
  return readJSON(STORE_PATH).filter(t => String(t.luchador_id) === String(luchador_id));
};

const getTicketsByAgrupacion = (agrupacion_id) => {
  return readJSON(STORE_PATH).filter(t => String(t.agrupacion_id) === String(agrupacion_id));
};

const getTicketById = (ticketId) => {
  return readJSON(STORE_PATH).find(t => String(t.id) === String(ticketId)) || null;
};

const updateTicket = (ticketId, fields) => {
  const tickets = readJSON(STORE_PATH);
  const idx = tickets.findIndex(t => String(t.id) === String(ticketId));
  if (idx === -1) return null;
  tickets[idx] = { ...tickets[idx], ...fields, fecha_actualizacion: new Date().toISOString() };
  writeJSON(STORE_PATH, tickets);
  return tickets[idx];
};

// ── MENSAJES ──────────────────────────────────────────────────────────────────

const crearMensaje = (data) => {
  const mensajes = readJSON(MENSAJES_PATH);
  const mensaje = { id: nextMensajeId(), ...data };
  mensajes.push(mensaje);
  writeJSON(MENSAJES_PATH, mensajes);
  return mensaje;
};

const getMensajesByTicket = (ticketId) => {
  return readJSON(MENSAJES_PATH).filter(m => String(m.ticket_id) === String(ticketId));
};

module.exports = {
  crearTicket,
  getTicketsByLuchador,
  getTicketsByAgrupacion,
  getTicketById,
  updateTicket,
  crearMensaje,
  getMensajesByTicket,
};
