# proyecto-sportshausen-back
Proyecto para Tesis de la Carrera Analista Programador de DUOC UC Sede San Joaquín, Año 2026 - Primer Semestre

Backend — SportsHausen
Tecnologías
Tecnología	Versión	Rol
Node.js	20.x	Runtime
Express	5.x	Framework HTTP
jsonwebtoken	9.x	Firma y verificación de JWT
bcryptjs	3.x	Hash de contraseñas
axios	1.x	Cliente HTTP hacia Xano
express-rate-limit	8.x	Rate limiting en rutas de auth
morgan	1.x	Logging de requests HTTP
cors	2.x	Control de orígenes permitidos
dotenv	17.x	Variables de entorno
nodemon	3.x	Hot reload en desarrollo
Arquitectura
El backend actúa como proxy seguro entre el frontend (Netlify) y Xano (no-code backend). El frontend nunca habla directamente con Xano — todo pasa por este servidor.

Frontend (Netlify)
    │
    ▼
Express API (Railway)          ← valida JWT, controla roles
    │
    ▼
Xano (no-code backend)         ← base de datos y lógica de negocio
Estructura de carpetas
src/
├── apps.js                    # Express app, middlewares, registro de rutas
├── controller/
│   ├── authControllers.js     # Login, signup, logout
│   ├── ticketControllers.js   # CRUD tickets
│   ├── userControllers.js     # Gestión de usuarios
│   └── emailControllers.js    # Envío de emails
├── middlewares/
│   ├── authMiddleware.js      # Verifica JWT, extrae xanoToken
│   └── logger.js              # Logger de requests
├── routes/
│   ├── authRoutes.js          # POST /api/auth/login|signup|logout
│   ├── userRoutes.js          # GET|POST /api/users
│   ├── profileRoutes.js       # GET|PATCH|PUT /api/profile/:id
│   ├── ticketRoutes.js        # CRUD /api/tickets
│   ├── eventosRoutes.js       # CRUD /api/eventos
│   ├── disponibilidadRoutes.js# GET|POST|DELETE /api/disponibilidad
│   ├── mensajesRoutes.js      # /api/mensajes
│   └── emailRoutes.js         # /api/emails
└── services/
    ├── xanoService.js         # Llamadas a la API de Xano
    ├── userMapService.js      # Cache local de roles de usuario
    ├── calendarioMarcasService.js  # Marcas de disponibilidad (JSON local)
    └── ticketStoreService.js  # Store local de tickets
index.js                       # Entry point — levanta el servidor
Flujo de autenticación
Frontend envía POST /api/auth/login con email y password
El backend valida credenciales contra Xano
Si es válido, firma un JWT propio con { xanoToken, id, email, role }
El frontend guarda ese JWT en localStorage como authToken
En cada request protegida, authMiddleware decodifica el JWT y pone req.token = xanoToken para reenviar a Xano
Variables de entorno requeridas
XANO_API_URL=
XANO_MENSAJERIA_URL=
XANO_SPORTSHAUSEN_URL=
XANO_DISPONIBILIDAD_URL=
BCRYPT_ROUNDS=10
TOKEN_TTL_HOURS=8
JWT_SECRET=
FRONTEND_URL=
Deploy
Desplegado en Railway con npm start (node index.js).
