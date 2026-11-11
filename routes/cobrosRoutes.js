const express = require('express');
const router = express.Router();
const cobrosController = require('../controllers/cobrosController');
const { estaAutenticado, esSocio, esAdmin, permitirRoles } = require('../middlewares/auth');

// --- Rutas Socio (Estado de Cuenta y PDF) ---
router.get('/socio/estado-cuenta', estaAutenticado, esSocio, cobrosController.getEstadoCuenta);
router.get('/socio/periodos-anteriores', estaAutenticado, esSocio, cobrosController.getPeriodosAnteriores);
router.get('/socio/descargar-pdf/:id', estaAutenticado, esSocio, cobrosController.descargarPDF);

// --- Rutas Administrativas (Encargado de Cobros y Admin General) ---
router.get('/admin/cobros', estaAutenticado, esAdmin, permitirRoles('admin_general', 'encargado_cobros'), cobrosController.getAdminCobros);
router.post('/admin/cobros/pagar', estaAutenticado, esAdmin, permitirRoles('admin_general', 'encargado_cobros'), cobrosController.postRegistrarPago);
router.post('/admin/cobros/recordatorios', estaAutenticado, esAdmin, permitirRoles('admin_general', 'encargado_cobros'), cobrosController.postEnviarRecordatorios);

// Centro de notificaciones y bitacora (Admin General)
router.get('/admin/notificaciones', estaAutenticado, esAdmin, permitirRoles('admin_general'), cobrosController.getAdminNotificaciones);
router.post('/admin/notificaciones/plantilla', estaAutenticado, esAdmin, permitirRoles('admin_general'), cobrosController.postActualizarPlantilla);
router.post('/admin/notificaciones/crear', estaAutenticado, esAdmin, permitirRoles('admin_general'), cobrosController.postCrearPlantilla);
router.post('/admin/notificaciones/eliminar', estaAutenticado, esAdmin, permitirRoles('admin_general'), cobrosController.postEliminarPlantilla);
router.get('/admin/bitacora-notificaciones', estaAutenticado, esAdmin, permitirRoles('admin_general'), cobrosController.getAdminBitacora);

module.exports = router;
