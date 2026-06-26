const xanoService = require('../services/xanoService');

const sendWelcomeEmail = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Validar que user_id esté presente
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id es requerido'
      });
    }

    // Llamar a Xano para enviar email de bienvenida
    const xanoResponse = await xanoService.sendWelcomeEmail(user_id);

    if (!xanoResponse.success) {
      return res.status(xanoResponse.status).json({
        success: false,
        error: xanoResponse.error,
        message: 'Error al enviar el email de bienvenida'
      });
    }

    return res.status(200).json({
      success: true,
      data: xanoResponse.data,
      message: 'Email de bienvenida enviado exitosamente'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  sendWelcomeEmail
};
