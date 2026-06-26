const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getXanoToken } = require('../middlewares/authMiddleware');

// Usa XANO_MENSAJERIA_URL si existe (grupo separado), si no cae al URL principal
const xanoAPI = axios.create({
  baseURL: process.env.XANO_MENSAJERIA_URL || process.env.XANO_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Extrae el token de Xano (decodificando nuestro JWT si aplica) y lo adjunta como req.token
const extractToken = (req, res, next) => {
  const token = getXanoToken(req);
  if (!token) return res.status(401).json({ error: 'Sin token de autenticación' });
  req.token = token;
  next();
};

const cfg = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// GET /api/mensajes/conversaciones
router.get('/conversaciones', extractToken, async (req, res) => {
  try {
    const r = await xanoAPI.get('/conversaciones', cfg(req.token));
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

// POST /api/mensajes/conversaciones  { usuario_2_id }
router.post('/conversaciones', extractToken, async (req, res) => {
  try {
    const r = await xanoAPI.post('/conversaciones', { usuario_2_id: req.body.usuario_2_id }, cfg(req.token));
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

// GET /api/mensajes/conversaciones/:id
router.get('/conversaciones/:id', extractToken, async (req, res) => {
  try {
    const r = await xanoAPI.get(`/conversaciones/${req.params.id}/mensajes`, cfg(req.token));
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

// POST /api/mensajes  { conversacion_id, contenido }
router.post('/', extractToken, async (req, res) => {
  try {
    const { conversacion_id, contenido } = req.body;
    const r = await xanoAPI.post('/mensajes', { conversacion_id, contenido }, cfg(req.token));
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

// PATCH /api/mensajes/leer  { conversacion_id }
router.patch('/leer', extractToken, async (req, res) => {
  try {
    const r = await xanoAPI.patch('/mensajes/leer', { conversacion_id: req.body.conversacion_id }, cfg(req.token));
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

module.exports = router;
