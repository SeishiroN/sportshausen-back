/**
 * Auth Controllers
 *
 * Flujo de contraseñas:
 *  - Signup : bcrypt.hash(pwd) → hash almacenado localmente (cache) y enviado a Xano.
 *             Xano guarda el hash tal cual (string). Nunca viaja la contraseña en claro.
 *  - Login  : bcrypt.compare(pwd, hash_local) valida PRIMERO en Node.js.
 *             Si es válido, se envía el hash a Xano → Xano hace comparación string-igual.
 */

const bcrypt      = require('bcryptjs');
const xanoService = require('../services/xanoService');
const userMapService = require('../services/userMapService');
const { storeToken, removeToken } = require('../middlewares/authMiddleware');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

// ─── Validadores ────────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Reglas de complejidad de contraseña.
 * Retorna null si es válida, o un string con el error si no lo es.
 */
const validatePasswordComplexity = (pwd) => {
  if (!pwd || typeof pwd !== 'string') return 'Contraseña requerida';
  if (pwd.length < 8)  return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(pwd)) return 'La contraseña debe contener al menos una letra mayúscula';
  if (!/[a-z]/.test(pwd)) return 'La contraseña debe contener al menos una letra minúscula';
  if (!/[0-9]/.test(pwd)) return 'La contraseña debe contener al menos un número';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'La contraseña debe contener al menos un carácter especial (!@#$%^&*)';
  return null;
};

// ─── Extraer JWT de la respuesta de Xano ────────────────────────────────────

const extractToken = (obj) => {
  if (!obj) return null;
  for (const k of ['authToken', 'token', 'access_token', 'auth_token']) {
    if (obj[k] && typeof obj[k] === 'string') return obj[k];
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && key.toLowerCase().includes('token')) return val;
    if (val && typeof val === 'object') {
      const nested = extractToken(val);
      if (nested) return nested;
    }
  }
  // Heurística JWT (header.payload.signature)
  const findJWT = (o) => {
    if (!o) return null;
    if (typeof o === 'string' && o.split('.').length === 3 && o.length > 20) return o;
    if (typeof o === 'object') {
      for (const k of Object.keys(o)) { const r = findJWT(o[k]); if (r) return r; }
    }
    return null;
  };
  return findJWT(obj);
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }

    // ── Validación bcrypt local (primera línea de defensa) ────────────────
    // Si tenemos hash local, validamos ANTES de llamar a Xano.
    // Xano siempre recibe la contraseña PLANA — él hace su propio bcrypt.
    const storedHash = userMapService.getPasswordHash(email);
    if (storedHash) {
      const passwordValid = await bcrypt.compare(password, storedHash);
      if (!passwordValid) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }
    }

    // ── Delegar autenticación real a Xano con contraseña plana ─────────────
    const xanoResponse = await xanoService.login(email, password);
    if (!xanoResponse.success) {
      return res.status(xanoResponse.status || 401).json({ success: false, error: 'Credenciales inválidas' });
    }

    // ── Migración: si no había hash local, guardarlo sin rol para que
    // _buildLoginResponse lo determine correctamente desde Xano ─────────────
    if (!storedHash) {
      const userId = xanoResponse.data?.user_id || xanoResponse.data?.id;
      const migrationHash = await bcrypt.hash(password, SALT_ROUNDS);
      // Guardamos solo el hash — el rol se fijará en _buildLoginResponse
      userMapService.saveUser(email, null, { user_id: userId, passwordHash: migrationHash });
    }

    return _buildLoginResponse(res, xanoResponse, email, password);

  } catch (err) {
    console.error('[login] Error interno');
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ─── SIGNUP ──────────────────────────────────────────────────────────────────

const signup = async (req, res) => {
  try {
    const { name, email, password, role = 'luchador' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nombre, email y contraseña son requeridos' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'El nombre debe tener al menos 2 caracteres' });
    }

    // ── Validación de complejidad de contraseña ────────────────────────────
    const pwdError = validatePasswordComplexity(password);
    if (pwdError) {
      return res.status(400).json({ success: false, error: pwdError });
    }

    // ── Normalizar rol ─────────────────────────────────────────────────────
    const validRoles = ['luchador', 'booker', 'agrupacion'];
    let finalRole = (role || 'luchador').toLowerCase().trim();
    if (finalRole === 'agrupación') finalRole = 'agrupacion';
    if (!validRoles.includes(finalRole)) {
      return res.status(400).json({ success: false, error: 'Rol inválido. Debe ser: luchador, booker o agrupacion' });
    }

    // ── Enviar contraseña PLANA a Xano (Xano aplica su propio bcrypt) ─────
    const xanoResponse = await xanoService.signup(name, email, password, finalRole);
    if (!xanoResponse.success) {
      return res.status(xanoResponse.status || 400).json({
        success: false,
        error: xanoResponse.error,
        message: 'Error al crear la cuenta',
      });
    }

    const token  = xanoResponse.data?.authToken || xanoResponse.data?.token;
    const userId = xanoResponse.data?.user_id   || xanoResponse.data?.id;

    // ── Guardar hash local para validación rápida en futuros logins ───────
    // Node.js valida con bcrypt.compare ANTES de llamar a Xano (optimización
    // y defensa en profundidad). Xano sigue siendo la fuente de verdad.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    userMapService.saveUser(email, finalRole, {
      nombre_artistico: name,
      user_id: userId,
      passwordHash,
    });

    const ourJWT = token
      ? storeToken(token, { id: userId, email, role: finalRole })
      : null;

    // Email de bienvenida
    if (userId) {
      xanoService.sendWelcomeEmail(userId).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      data: {
        authToken: ourJWT || token,
        user: { id: userId, email, nombre_artistico: name, role: finalRole },
      },
      message: 'Cuenta creada exitosamente',
    });

  } catch (err) {
    console.error('[signup] Error interno');
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ─── LOGOUT ──────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (token) {
      removeToken(token);
      xanoService.logout(token).catch(() => {});
    }

    return res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ─── Helper: normalizar rol desde múltiples nombres de campo de Xano ─────────

const _normalizeRole = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s === 'agrupacion') return 'agrupacion';
  if (s === 'booker') return 'booker';
  if (s === 'luchador') return 'luchador';
  return null;
};

const _extractRoleFromData = (data) => {
  if (!data) return null;
  return _normalizeRole(data.role) ||
         _normalizeRole(data.tipo_usuario) ||
         _normalizeRole(data.type) ||
         _normalizeRole(data.user_type) ||
         null;
};

// ─── Helper: construir respuesta de login ────────────────────────────────────

const _buildLoginResponse = async (res, xanoResponse, email, _pwd) => {
  const token  = extractToken(xanoResponse.data);
  const userId = xanoResponse.data?.user_id || xanoResponse.data?.id || xanoResponse.data?.user?.id;

  // Obtener usuario completo desde Xano — /auth/me devuelve role, full_name, etc.
  let profileData = null;
  try {
    if (token) {
      const me = await xanoService.getMe(token);
      if (me.success && me.data) {
        profileData = me.data;
      } else if (userId) {
        // Fallback: intentar getProfileById y getUserData
        const profile = await xanoService.getProfileById(token, userId);
        if (profile.success && profile.data) {
          profileData = profile.data;
        } else {
          const ud = await xanoService.getUserData(token, userId);
          if (ud.success && ud.data) profileData = ud.data;
        }
      }
    }
  } catch (e) {
    console.error('[_buildLoginResponse] error obteniendo perfil:', e.message);
  }

  // Detectar rol en orden de prioridad:
  // 1. Perfil completo de Xano (más confiable, tiene tipo_usuario)
  // 2. Respuesta directa del login de Xano
  // 3. Caché local
  // 4. Default 'luchador'
  let userRole =
    _extractRoleFromData(profileData) ||
    _extractRoleFromData(xanoResponse.data) ||
    _extractRoleFromData(xanoResponse.data?.user) ||
    userMapService.getUserRole(email) ||
    'luchador';

  console.log(`[login] rol detectado para ${email}: ${userRole}`);

  // Actualizar caché (preserva passwordHash)
  if (userMapService.getUserRole(email) !== userRole) {
    userMapService.updateRole(email, userRole);
  }

  // Emitir nuestro JWT (envuelve el token de Xano — stateless, sobrevive reinicios)
  const ourJWT = token
    ? storeToken(token, { id: userId, email, role: userRole })
    : null;

  const responseData = {
    authToken: ourJWT || token,   // nuestro JWT va al frontend
    user: {
      ...(profileData || {}),
      role: userRole,
      email,
      id: userId,
    },
  };

  return res.status(200).json({ success: true, data: responseData, message: 'Login exitoso' });
};

module.exports = { login, signup, logout };
