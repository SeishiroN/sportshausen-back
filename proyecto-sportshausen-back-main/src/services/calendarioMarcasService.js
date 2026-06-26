/**
 * Almacén server-side de marcas de calendario pendientes.
 * Cuando una agrupación acepta una postulación, guarda la fecha aquí.
 * Cuando el luchador abre su calendario, las lee, las aplica a Xano y las borra.
 */

const fs   = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../../data/calendario_marcas.json');

const ensureDir = () => {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const read = () => {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch { return []; }
};

const write = (data) => {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
};

const agregarMarca = ({ luchador_id, fechaStr, razon }) => {
  const all = read();
  const ya = all.some(m => String(m.luchador_id) === String(luchador_id) && m.fechaStr === fechaStr);
  if (!ya) {
    all.push({ id: Date.now(), luchador_id: String(luchador_id), fechaStr, razon });
    write(all);
  }
};

const getMarcasPorLuchador = (luchador_id) =>
  read().filter(m => String(m.luchador_id) === String(luchador_id));

const eliminarMarca = (id) => {
  write(read().filter(m => String(m.id) !== String(id)));
};

module.exports = { agregarMarca, getMarcasPorLuchador, eliminarMarca };
