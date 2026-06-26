const express = require('express');
const router = express.Router();
const axios = require('axios');
const { softProtect, getXanoToken } = require('../middlewares/authMiddleware');

const XANO_URL = process.env.XANO_SPORTSHAUSEN_URL || 'https://x8ki-letl-twmt.n7.xano.io/api:sportshausen';

const cfg = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// GET /api/eventos
router.get('/', softProtect, async (req, res) => {
  try {
    const r = await axios.get(`${XANO_URL}/eventos`, cfg(getXanoToken(req)));
    res.json(r.data ?? []);
  } catch (e) {
    console.error('GET /eventos:', e.response?.data || e.message);
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

const calcHoraFin = (horaInicio, duracion) => {
  const [hh, mm] = horaInicio.split(':').map(Number);
  let fin = hh + duracion;
  if (fin >= 24) fin -= 24;
  return `${String(fin).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

// POST /api/eventos
router.post('/', softProtect, async (req, res) => {
  try {
    const token = getXanoToken(req);
    const { hora_inicio, duracion, ...rest } = req.body;
    const hora_fin = calcHoraFin(hora_inicio, duracion);
    const payload = { ...rest, hora_inicio, duracion, hora_fin };
    console.log('📤 POST /eventos payload:', JSON.stringify(payload));
    const r = await axios.post(`${XANO_URL}/eventos_create`, payload, cfg(token));
    console.log('✅ Xano status:', r.status, '| response:', JSON.stringify(r.data));
    res.status(201).json(r.data ?? {});
  } catch (e) {
    console.error('POST /eventos:', e.response?.data || e.message);
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

// PUT /api/eventos/:id
router.put('/:id', softProtect, async (req, res) => {
  try {
    const r = await axios.put(`${XANO_URL}/eventos/${req.params.id}`, req.body, cfg(getXanoToken(req)));
    res.json(r.data ?? {});
  } catch (e) {
    console.error('PUT /eventos:', e.response?.data || e.message);
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

// DELETE /api/eventos/:id
router.delete('/:id', softProtect, async (req, res) => {
  try {
    const r = await axios.delete(`${XANO_URL}/eventos/${req.params.id}`, cfg(getXanoToken(req)));
    res.json(r.data ?? {});
  } catch (e) {
    console.error('DELETE /eventos:', e.response?.data || e.message);
    res.status(e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

module.exports = router;
