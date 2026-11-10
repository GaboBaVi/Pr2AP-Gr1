const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { estaAutenticado, esSocio } = require('../middlewares/auth');

// Rutas publicas de autenticacion
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.get('/recovery', authController.getRecovery);
router.post('/recovery', authController.postRecovery);
router.get('/logout', authController.logout);

// Rutas protegidas del socio (Perfil y datos)
router.get('/perfil', estaAutenticado, esSocio, authController.getPerfil);
router.post('/perfil/editar', estaAutenticado, esSocio, authController.postEditarPerfil);
router.post('/perfil/beneficiarios', estaAutenticado, esSocio, authController.postAgregarBeneficiario);

module.exports = router;
