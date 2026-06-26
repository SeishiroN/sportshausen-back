const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getXanoToken, softProtect } = require('../middlewares/authMiddleware');
const marcasService = require('../services/calendarioMarcasService');

const XANO_DISP_URL = 'https://x8ki-letl-twmt.n7.xano.io/api:disponibilidad/disponibilidad';

// GET /api/disponibilidad — obtener fechas del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const token = getXanoToken(req);
    const response = await axios.get(XANO_DISP_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(response.data);
  } catch (err) {
    console.error('GET /disponibilidad error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// POST /api/disponibilidad — crear o actualizar una fecha
router.post('/', async (req, res) => {
  try {
    const token = getXanoToken(req);
    const { fecha, status, razon } = req.body;
    console.log('📤 POST Xano body:', { fecha, status, razon });
    console.log('📤 POST Xano URL:', XANO_DISP_URL);
    console.log('📤 Token presente:', !!token);
    const response = await axios.post(XANO_DISP_URL, { fecha, status, razon }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Xano response status:', response.status);
    console.log('✅ Xano response data:', JSON.stringify(response.data));
    res.json(response.data);
  } catch (err) {
    console.error('❌ POST /disponibilidad error status:', err.response?.status);
    console.error('❌ POST /disponibilidad error data:', JSON.stringify(err.response?.data));
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// DELETE /api/disponibilidad/:fecha — eliminar una fecha
router.delete('/:fecha', async (req, res) => {
  try {
    const token = getXanoToken(req);
    const { fecha } = req.params;
    const response = await axios.delete(`${XANO_DISP_URL}/${fecha}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(response.data || {});
  } catch (err) {
    console.error('DELETE /disponibilidad error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// POST /api/disponibilidad/pendientes — agrupacion registra marca para un luchador
router.post('/pendientes', softProtect, (req, res) => {
  const { luchador_id, fechaStr, razon } = req.body;
  if (!luchador_id || !fechaStr) {
    return res.status(400).json({ error: 'luchador_id y fechaStr son requeridos' });
  }
  marcasService.agregarMarca({ luchador_id, fechaStr, razon: razon || '' });
  res.json({ success: true });
});

// GET /api/disponibilidad/pendientes — luchador lee sus marcas pendientes y las borra
router.get('/pendientes', softProtect, (req, res) => {
  const luchador_id = req.user?.id;
  if (!luchador_id) return res.status(401).json({ error: 'Sin usuario' });
  const marcas = marcasService.getMarcasPorLuchador(luchador_id);
  marcas.forEach(m => marcasService.eliminarMarca(m.id));
  res.json({ marcas });
});

module.exports = router;
