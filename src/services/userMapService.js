/**
 * Caché local de email → { rol, passwordHash }
 * Permite validar credenciales con bcrypt en Node.js antes de llamar a Xano.
 * Solo almacena el HASH de la contraseña, nunca la contraseña en texto plano.
 */

const fs   = require('fs');
const path = require('path');

const USERS_MAP_FILE = path.join(__dirname, '..', '..', '.users-cache.json');

let usersMap = {};
try {
  if (fs.existsSync(USERS_MAP_FILE)) {
    usersMap = JSON.parse(fs.readFileSync(USERS_MAP_FILE, 'utf8'));
  }
} catch {
  usersMap = {};
}

const _persist = () => {
  try { fs.writeFileSync(USERS_MAP_FILE, JSON.stringify(usersMap, null, 2)); }
  catch (e) { console.error('[userMapService] Error al persistir cache:', e.message); }
};

/**
 * Guarda email, rol y hash de contraseña (bcrypt).
 * userData puede incluir { nombre_artistico, user_id, passwordHash }.
 */
const saveUser = (email, role, userData = {}) => {
  try {
    email = email.toLowerCase().trim();
    usersMap[email] = {
      role,
      email,
      createdAt: new Date().toISOString(),
      ...userData,
    };
    _persist();
    return true;
  } catch (e) {
    console.error('[userMapService] Error al guardar usuario:', e.message);
    return false;
  }
};

/** Actualiza solo el rol sin tocar otros campos (passwordHash, etc.). */
const updateRole = (email, role) => {
  try {
    email = email.toLowerCase().trim();
    if (usersMap[email]) {
      usersMap[email].role = role;
    } else {
      usersMap[email] = { role, email, createdAt: new Date().toISOString() };
    }
    _persist();
    return true;
  } catch (e) {
    console.error('[userMapService] Error al actualizar rol:', e.message);
    return false;
  }
};

/** Devuelve el rol local o null si no existe. */
const getUserRole = (email) => {
  try {
    email = email.toLowerCase().trim();
    return usersMap[email]?.role || null;
  } catch { return null; }
};

/** Devuelve el hash bcrypt almacenado para ese email, o null. */
const getPasswordHash = (email) => {
  try {
    email = email.toLowerCase().trim();
    return usersMap[email]?.passwordHash || null;
  } catch { return null; }
};

const getAllUsers = () => usersMap;

const clearCache = () => {
  try {
    usersMap = {};
    if (fs.existsSync(USERS_MAP_FILE)) fs.unlinkSync(USERS_MAP_FILE);
    return true;
  } catch (e) {
    console.error('[userMapService] Error al limpiar cache:', e.message);
    return false;
  }
};

module.exports = { saveUser, updateRole, getUserRole, getPasswordHash, getAllUsers, clearCache };
