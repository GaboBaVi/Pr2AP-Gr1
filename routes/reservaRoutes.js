const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { estaAutenticado, esSocio } = require('../middlewares/auth');

// Consulta publica de disponibilidad horaria (permite actualizar el selector sin bloqueos de sesion)
router.get('/reservas/disponibilidad-horaria', reservaController.getDisponibilidadHoraria);

router.use(estaAutenticado, esSocio);

router.get('/dashboard', reservaController.getDashboard);
router.get('/reservas', reservaController.getMisReservas);
router.get('/reservar', reservaController.getFormularioReserva);
router.post('/reservar', reservaController.postCrearReserva);
router.get('/reservas/editar/:id', reservaController.getEditarReserva);
router.post('/reservas/editar/:id', reservaController.postEditarReserva);
router.post('/reservas/cancelar', reservaController.postCancelarReserva);

module.exports = router;
