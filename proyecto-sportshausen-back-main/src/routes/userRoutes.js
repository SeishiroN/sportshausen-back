const express = require('express');
const router = express.Router();
const userController = require('../controller/userControllers');
const { verifyAuth } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

// Rutas protegidas (requieren autenticación)
router.post('/', verifyAuth, userController.createUser);
router.put('/:id', verifyAuth, userController.updateUser);
router.delete('/:id', verifyAuth, userController.deleteUser);

module.exports = router;