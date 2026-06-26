const express = require('express');
const router = express.Router();
const authController = require('../controller/authControllers');
const { verifyAuth } = require('../middlewares/authMiddleware');

// Rutas de autenticación públicas
router.post('/login', authController.login);
router.post('/signup', authController.signup);

// Rutas de autenticación protegidas
router.post('/logout', verifyAuth, authController.logout);

module.exports = router;
