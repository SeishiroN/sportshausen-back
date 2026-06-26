/**
 * Auth Middleware — JWT stateless
 *
 * En lugar de un Map en memoria (que se pierde en cada reinicio de nodemon),
 * se emite un JWT propio firmado con JWT_SECRET que contiene el token de Xano.
 * El middleware verifica la firma y extrae req.token (Xano JWT) sin tocar ningún store.
 *
 * Flujo:
 *   Login → jwt.sign({ xanoToken, id, email, role }) → nuestro JWT al frontend
 *   Request → jwt.verify(nuestro JWT) → req.token = xanoToken para llamadas a Xano
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET  = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_TTL_S = (parseInt(process.env.TOKEN_TTL_HOURS, 10) || 8) * 3600;

// ── Helpers ──────────────────────────────────────────────────────────────────

const extractBearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : h || null;
};

const errUnauth = (res, msg = 'Token inválido o expirado') =>
  res.status(401).json({ success: false, error: msg, message: 'Por favor inicia sesión nuevamente' });

// ── storeToken → ahora emite nuestro JWT ─────────────────────────────────────

/**
 * Genera nuestro JWT que envuelve el token de Xano.
 * Retorna el string JWT firmado que se enviará al frontend.
 */
const storeToken = (xanoToken, userData) => {
  return jwt.sign(
    {
      xanoToken,
      id:    userData.id    || userData.user_id || null,
      email: userData.email || null,
      role:  userData.role  || 'luchador',
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL_S }
  );
};

// ── removeToken → sin store, logout es solo del lado del cliente ──────────────

const removeToken = (_token) => {
  // Con JWT stateless no hay nada que eliminar del servidor.
  // El frontend limpia localStorage en logout.
};

// ── decode helper ─────────────────────────────────────────────────────────────

const decodeOurJWT = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// ── verifyAuth ────────────────────────────────────────────────────────────────

const verifyAuth = (req, res, next) => {
  const token = extractBearer(req);
  if (!token) return errUnauth(res, 'No se proporcionó token de autenticación');

  const decoded = decodeOurJWT(token);
  if (!decoded) return errUnauth(res);

  req.user  = { id: decoded.id, email: decoded.email, role: decoded.role };
  req.token = decoded.xanoToken || token;
  next();
};

// ── protect (alias de verifyAuth) ─────────────────────────────────────────────

const protect = (req, res, next) => {
  const token = extractBearer(req);
  if (!token) return errUnauth(res, 'No se proporcionó token de autenticación');

  const decoded = decodeOurJWT(token);
  if (!decoded) return errUnauth(res);

  req.user  = { id: decoded.id, email: decoded.email, role: decoded.role };
  req.token = decoded.xanoToken || token;
  next();
};

// ── requireRole ───────────────────────────────────────────────────────────────

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  const userRole = req.user.role;
  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Permiso denegado',
      message: `Se requiere uno de los siguientes roles: ${roles.join(', ')}`,
    });
  }
  next();
};

// ── softProtect — valida contra Xano (sin cambios) ───────────────────────────

const softProtect = async (req, res, next) => {
  // Primero intentar decodificar nuestro JWT (evita llamada a Xano)
  const rawToken = extractBearer(req);
  if (!rawToken) return res.status(401).json({ success: false, error: 'Token requerido' });

  const decoded = decodeOurJWT(rawToken);
  if (decoded) {
    req.token = decoded.xanoToken || rawToken;
    req.user  = { id: decoded.id, role: decoded.role };
    return next();
  }

  // Fallback: token de Xano directo (compatibilidad) → validar contra /auth/me
  const xanoBase = process.env.XANO_API_URL;
  const authCfg  = { headers: { Authorization: `Bearer ${rawToken}` }, timeout: 5000 };
  const endpoints = ['/auth/me', '/user', '/auth/user', '/users/me'];

  for (const ep of endpoints) {
    try {
      const { data } = await axios.get(`${xanoBase}${ep}`, authCfg);
      if (data && (data.id || data.user_id)) {
        req.token = rawToken;
        req.user  = { id: data.id || data.user_id, role: data.role || data.tipo_usuario || null };
        return next();
      }
    } catch (_) {}
  }

  return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
};

/**
 * Extrae el token de Xano desde la request.
 * Primero usa req.token si ya lo puso un middleware (softProtect/protect/verifyAuth).
 * Si no, decodifica nuestro JWT del header y retorna el xanoToken interno.
 * Fallback: retorna el raw token (compatibilidad con tokens directos de Xano).
 */
const getXanoToken = (req) => {
  if (req.token) return req.token;
  const h = req.headers.authorization || '';
  const raw = h.startsWith('Bearer ') ? h.slice(7) : h || null;
  if (!raw) return null;
  const decoded = decodeOurJWT(raw);
  return decoded?.xanoToken || raw;
};

module.exports = { verifyAuth, storeToken, removeToken, protect, requireRole, softProtect, getXanoToken };
