# Autenticación con Xano

## Endpoints de Autenticación

### 1. Signup (Registrarse)
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "tu_contraseña"
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "data": {
    "authToken": "token_aqui",
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@example.com"
    }
  },
  "message": "Cuenta creada exitosamente"
}
```

**Errores (400, 409):**
```json
{
  "success": false,
  "error": "El email ya está registrado",
  "message": "Error al crear la cuenta"
}
```

---

### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "tu_contraseña"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "authToken": "token_aqui",
    "user": {
      "id": 1,
      "email": "usuario@example.com"
    }
  },
  "message": "Login exitoso"
}
```

---

### 3. Logout (Requiere autenticación)
```http
POST /api/auth/logout
Authorization: Bearer {authToken}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

## Endpoints Protegidos

Todos los endpoints de modificación de usuarios (`POST`, `PUT`, `DELETE`) requieren token:

### Crear Usuario
```http
POST /api/users
Authorization: Bearer {authToken}
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@example.com"
}
```

### Actualizar Usuario
```http
PUT /api/users/1
Authorization: Bearer {authToken}
Content-Type: application/json

{
  "name": "Juan García",
  "email": "juan@example.com"
}
```

### Eliminar Usuario
```http
DELETE /api/users/1
Authorization: Bearer {authToken}
```

---

## Endpoints Públicos

### Obtener todos los usuarios
```http
GET /api/users
```

### Obtener usuario por ID
```http
GET /api/users/1
```

---

## Endpoints de Emails

### 1. Enviar Email de Bienvenida (Requiere autenticación)
```http
POST /api/emails/welcome
Authorization: Bearer {authToken}
Content-Type: application/json

{
  "user_id": 1
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "email_sent": true,
    "timestamp": "2025-05-17T10:30:00Z"
  },
  "message": "Email de bienvenida enviado exitosamente"
}
```

**Nota:** El email de bienvenida se envía **automáticamente** al crear una nueva cuenta en el signup. Este endpoint es útil si necesitas reenviar el email manualmente.

---

**Sin token (401):**
```json
{
  "success": false,
  "error": "No se proporcionó token de autenticación",
  "message": "Por favor inicia sesión"
}
```

**Token inválido o expirado (401):**
```json
{
  "success": false,
  "error": "Token inválido o expirado",
  "message": "Por favor inicia sesión nuevamente"
}
```

---

## Cómo usar en el frontend

```javascript
// 1. Signup (Registrarse)
const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'tu_contraseña'
  })
});

const signupData = await signupResponse.json();
if (signupData.success) {
  const token = signupData.data.authToken;
  localStorage.setItem('token', token);
}

// 2. Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'usuario@example.com',
    password: 'contraseña'
  })
});

const loginData = await loginResponse.json();
if (loginData.success) {
  const token = loginData.data.authToken;
  localStorage.setItem('token', token);
}

// 3. Usar token en peticiones protegidas
const token = localStorage.getItem('token');
const createUserResponse = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Nuevo Usuario',
    email: 'nuevo@example.com'
  })
});

// 4. Logout
await fetch('http://localhost:3000/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
localStorage.removeItem('token');
```
