const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const { estaAutenticado, esSocio } = require('../middlewares/auth');

router.use(estaAutenticado, esSocio);

router.get('/dashboard', reservaController.getDashboard);
router.get('/reservas', reservaController.getMisReservas);
router.get('/reservar', reservaController.getFormularioReserva);
router.post('/reservar', reservaController.postCrearReserva);
router.post('/reservas/cancelar', reservaController.postCancelarReserva);

module.exports = router;
