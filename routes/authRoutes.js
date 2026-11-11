const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { estaAutenticado, esSocio } = require('../middlewares/auth');

// Rutas públicas de autenticación
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.get('/recovery', authController.getRecovery);
router.post('/recovery', authController.postRecovery);
router.get('/reset/:token', authController.getResetPassword);
router.post('/reset/:token', authController.postResetPassword);
router.get('/logout', authController.logout);

// Rutas protegidas del socio (Perfil y datos)
router.get('/perfil', estaAutenticado, esSocio, authController.getPerfil);
router.post('/perfil/editar', estaAutenticado, esSocio, authController.postEditarPerfil);
router.post('/perfil/beneficiarios', estaAutenticado, esSocio, authController.postAgregarBeneficiario);
router.post('/perfil/beneficiarios/editar', estaAutenticado, esSocio, authController.postEditarBeneficiario);
router.post('/perfil/beneficiarios/eliminar', estaAutenticado, esSocio, authController.postEliminarBeneficiario);

module.exports = router;
