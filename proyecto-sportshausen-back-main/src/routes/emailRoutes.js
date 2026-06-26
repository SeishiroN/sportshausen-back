const express = require('express');
const router = express.Router();
const emailController = require('../controller/emailControllers');
const { verifyAuth } = require('../middlewares/authMiddleware');

// Rutas de emails (protegidas)
router.post('/welcome', verifyAuth, emailController.sendWelcomeEmail);

module.exports = router;
