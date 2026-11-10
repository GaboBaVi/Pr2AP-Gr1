const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { estaAutenticado, esAdmin, permitirRoles } = require('../middlewares/auth');

router.use(estaAutenticado, esAdmin);

// Dashboard principal del Admin
router.get('/dashboard', adminController.getDashboard);

// Modulo de gestion de socios (Admin General)
router.get('/socios', permitirRoles('admin_general'), adminController.getSocios);
router.post('/socios/estado', permitirRoles('admin_general'), adminController.postCambiarEstadoSocio);
router.post('/socios/rol', permitirRoles('admin_general'), adminController.postCambiarRol);

// Modulo de instalaciones y calendario (Admin General y Encargado de Instalaciones)
router.get('/instalaciones', permitirRoles('admin_general', 'encargado_instalaciones'), adminController.getInstalaciones);
router.post('/instalaciones/bloquear', permitirRoles('admin_general', 'encargado_instalaciones'), adminController.postToggleBloqueo);

// Recepcion (Control de acceso para invitados)
router.get('/recepcion', adminController.getRecepcionInvitados);

module.exports = router;
