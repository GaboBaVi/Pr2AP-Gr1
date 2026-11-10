const Usuario = require('../models/usuarioModel');
const Membresia = require('../models/membresiaModel');
const Instalacion = require('../models/instalacionModel');
const Invitado = require('../models/invitadoModel');

const adminController = {
  getDashboard(req, res) {
    res.render('admin/dashboard', { usuario: req.session.usuario });
  },

  async getSocios(req, res) {
    try {
      const socios = await Usuario.listarSocios();
      res.render('admin/socios', {
        socios,
        mensaje: req.session.mensajeAdmin || null
      });
      delete req.session.mensajeAdmin;
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard');
    }
  },

  async postCambiarEstadoSocio(req, res) {
    const { id, estado } = req.body;
    try {
      await Usuario.cambiarEstado(id, estado);
      req.session.mensajeAdmin = 'Estado del socio actualizado correctamente.';
      res.redirect('/admin/socios');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/socios');
    }
  },

  async postCambiarRol(req, res) {
    const { id, rol } = req.body;
    try {
      await Usuario.cambiarRol(id, rol);
      req.session.mensajeAdmin = 'Rol administrativo actualizado.';
      res.redirect('/admin/socios');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/socios');
    }
  },

  async getInstalaciones(req, res) {
    const diaSeleccionado = req.query.dia || 'Viernes';
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

    try {
      const instalaciones = await Instalacion.listarTodas();
      const ocupacion = await Instalacion.obtenerOcupacionPorDia(fecha);

      res.render('admin/instalaciones', {
        instalaciones,
        diaSeleccionado,
        fecha,
        ocupacion,
        mensaje: req.session.mensajeInstalaciones || null
      });
      delete req.session.mensajeInstalaciones;
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard');
    }
  },

  async postToggleBloqueo(req, res) {
    const { id, motivo } = req.body;
    try {
      await Instalacion.toggleBloqueo(id, motivo || 'Mantenimiento preventivo');
      req.session.mensajeInstalaciones = 'Estado de instalacion modificado.';
      res.redirect('/admin/instalaciones');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/instalaciones');
    }
  },

  async getRecepcionInvitados(req, res) {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    try {
      const lista = await Invitado.listarPorFecha(fecha);
      res.render('admin/recepcion', { lista, fecha });
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard');
    }
  }
};

module.exports = adminController;
