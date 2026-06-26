const axios = require('axios');

const xanoAPI = axios.create({
  baseURL: process.env.XANO_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Llamar al endpoint de login de Xano
 */
/**
 * Obtener el usuario autenticado actual vía /auth/me (endpoint estándar de Xano).
 * Devuelve todos los campos del usuario incluyendo `role`, `full_name`, etc.
 */
const getMe = async (token) => {
  try {
    const response = await xanoAPI.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('[getMe] éxito:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (err) {
    console.log('[getMe] falló:', err.response?.status || err.message);
    return { success: false, data: null };
  }
};

const login = async (email, password) => {
  try {
    const response = await xanoAPI.post('/auth/login', { email, password });
    console.log('[xano login] full response keys:', Object.keys(response.data || {}));
    console.log('[xano login] data:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

/**
 * Obtener información del usuario - versión mejorada
 * Intenta múltiples rutas y endpoints
 */
const getUserData = async (token, userId = null) => {
  console.log('🔍 getUserData - Buscando usuario. Token:', token ? 'yes' : 'no', 'UserId:', userId);

  // Lista de endpoints a intentar en orden
  const endpointsToTry = [];
  
  // Si tenemos userId, intentar endpoints específicos primero
  if (userId) {
    endpointsToTry.push({
      method: 'get',
      url: `/users/${userId}`,
      headers: { 'Authorization': `Bearer ${token}` },
      name: `GET /users/${userId}`
    });
    endpointsToTry.push({
      method: 'get',
      url: `/user/${userId}`,
      headers: { 'Authorization': `Bearer ${token}` },
      name: `GET /user/${userId}`
    });
  }

  // Endpoints genéricos
  endpointsToTry.push({
    method: 'get',
    url: '/user',
    headers: { 'Authorization': `Bearer ${token}` },
    name: 'GET /user'
  });

  endpointsToTry.push({
    method: 'get',
    url: '/auth/me',
    headers: { 'Authorization': `Bearer ${token}` },
    name: 'GET /auth/me'
  });

  endpointsToTry.push({
    method: 'get',
    url: '/auth/user',
    headers: { 'Authorization': `Bearer ${token}` },
    name: 'GET /auth/user'
  });

  endpointsToTry.push({
    method: 'get',
    url: '/users/me',
    headers: { 'Authorization': `Bearer ${token}` },
    name: 'GET /users/me'
  });

  for (const endpoint of endpointsToTry) {
    try {
      console.log(`  → Intentando: ${endpoint.name}`);
      const config = {
        headers: endpoint.headers
      };
      
      const response = await xanoAPI[endpoint.method](endpoint.url, config);
      
      if (response.data) {
        console.log(`  ✅ Éxito en ${endpoint.name} - todos los campos:`, JSON.stringify(response.data, null, 2));
        return {
          success: true,
          data: response.data,
          endpoint: endpoint.name
        };
      }
    } catch (err) {
      const status = err.response?.status || 'unknown';
      console.log(`  ⚠️ Falló ${endpoint.name}: status ${status}`);
    }
  }

  console.log('❌ Todos los endpoints fallaron, no se puede obtener rol');
  return {
    success: false,
    data: null,
    endpoint: 'none'
  };
};

/**
 * Obtener información del usuario actual usando token o ID
 * (mantenido para compatibilidad)
 */
const getCurrentUser = async (token, userId = null) => {
  return await getUserData(token, userId);
};

/**
 * Validar token con Xano
 */
const validateToken = async (token) => {
  try {
    const response = await xanoAPI.get('/auth/validate', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

/**
 * Logout con Xano (si lo soporta)
 */
const logout = async (token) => {
  try {
    const response = await xanoAPI.post('/auth/logout', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

/**
 * Signup con Xano
 */
const signup = async (name, email, password, role = 'luchador') => {
  try {
    const response = await xanoAPI.post('/auth/signup', {
      nombre_artistico: name,
      email,
      password,   // bcrypt hash generado en authControllers
      role,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

/**
 * Enviar email de bienvenida
 */
const sendWelcomeEmail = async (userId) => {
  try {
    const response = await xanoAPI.post('/message/send_welcome_email', {
      user_id: userId
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

module.exports = {
  login,
  getMe,
  getUserData,
  /**
   * Obtener perfil detallado por id usando el endpoint /profile/{id}
   * Recomendado cuando Xano expone este endpoint que contiene `full_name`.
   */
  getProfileById: async (token, id) => {
    try {
      if (!token) throw new Error('No token provided');
      const attempts = [];

      // 1) GET /profile/{id}
      try {
        const url1 = `/profile/${id}`;
        console.log('🔍 getProfileById - Intento GET', url1);
        const resp1 = await xanoAPI.get(url1, { headers: { Authorization: `Bearer ${token}` } });
        if (resp1 && resp1.data) return { success: true, data: resp1.data, endpoint: `GET ${url1}` };
        attempts.push({ method: 'GET', url: url1, ok: false });
      } catch (err) {
        attempts.push({ method: 'GET', url: `/profile/${id}`, ok: false, err: err.response?.status || err.message });
      }

      // 2) GET /profile?id={id} (query param)
      try {
        const url2 = `/profile?id=${id}`;
        console.log('🔍 getProfileById - Intento GET con query', url2);
        const resp2 = await xanoAPI.get(`/profile`, { headers: { Authorization: `Bearer ${token}` }, params: { id } });
        if (resp2 && resp2.data) return { success: true, data: resp2.data, endpoint: `GET /profile?id=${id}` };
        attempts.push({ method: 'GET', url: url2, ok: false });
      } catch (err) {
        attempts.push({ method: 'GET', url: `/profile?id=${id}`, ok: false, err: err.response?.status || err.message });
      }

      // 3) POST /profile with body { id }
      try {
        const url3 = `/profile`;
        console.log('🔍 getProfileById - Intento POST', url3, 'body:', { id });
        const resp3 = await xanoAPI.post(url3, { id }, { headers: { Authorization: `Bearer ${token}` } });
        if (resp3 && resp3.data) return { success: true, data: resp3.data, endpoint: `POST ${url3}` };
        attempts.push({ method: 'POST', url: url3, ok: false });
      } catch (err) {
        attempts.push({ method: 'POST', url: `/profile`, ok: false, err: err.response?.status || err.message });
      }

      // 4) If XANO_PROFILE_ENDPOINT env var is set, try it (POST or GET depending)
      if (process.env.XANO_PROFILE_ENDPOINT) {
        try {
          const custom = process.env.XANO_PROFILE_ENDPOINT;
          console.log('🔍 getProfileById - Intento endpoint personalizado', custom);
          // Try POST with id
          const respCustom = await xanoAPI.post(custom, { id }, { headers: { Authorization: `Bearer ${token}` } });
          if (respCustom && respCustom.data) return { success: true, data: respCustom.data, endpoint: `POST ${custom}` };
          attempts.push({ method: 'POST', url: custom, ok: false });
        } catch (err) {
          attempts.push({ method: 'POST', url: process.env.XANO_PROFILE_ENDPOINT, ok: false, err: err.response?.status || err.message });
        }
      }

      console.log('⚠️ getProfileById - Todos los intentos fallaron:', attempts);
      return { success: false, data: null, attempts };
    } catch (error) {
      console.log('⚠️ getProfileById falló:', error.message || error);
      return { success: false, error: error.response?.data || error.message, status: error.response?.status || 500 };
    }
  },
  getCurrentUser,
  validateToken,
  logout,
  signup,
  sendWelcomeEmail
};
