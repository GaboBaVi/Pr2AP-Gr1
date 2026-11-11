const Usuario = require('../models/usuarioModel');
const Membresia = require('../models/membresiaModel');
const Instalacion = require('../models/instalacionModel');
const Invitado = require('../models/invitadoModel');
const bcrypt = require('bcryptjs');
const { enviarCorreo } = require('../config/mailer');

const adminController = {
  getDashboard(req, res) {
    res.render('admin/dashboard', { usuario: req.session.usuario });
  },

  async getSocios(req, res) {
    try {
      const socios = await Usuario.listarSocios();
      res.render('admin/socios', {
        socios,
        mensaje: req.session.mensajeAdmin || null,
        error: req.session.errorAdmin || null
      });
      delete req.session.mensajeAdmin;
      delete req.session.errorAdmin;
    } catch (err) {
      console.error('Error en getSocios:', err);
      res.redirect('/admin/dashboard');
    }
  },

  async postCambiarEstadoSocio(req, res) {
    const { id, estado } = req.body;
    try {
      await Usuario.cambiarEstado(id, estado);
      req.session.mensajeAdmin = `Estado del usuario actualizado a ${estado}.`;
      res.redirect('/admin/socios');
    } catch (err) {
      console.error('Error en postCambiarEstadoSocio:', err);
      res.redirect('/admin/socios');
    }
  },

  async postCambiarRol(req, res) {
    const { id, rol } = req.body;
    try {
      await Usuario.cambiarRol(id, rol);
      req.session.mensajeAdmin = `Rol administrativo actualizado a ${rol}.`;
      res.redirect('/admin/socios');
    } catch (err) {
      console.error('Error en postCambiarRol:', err);
      res.redirect('/admin/socios');
    }
  },

  // Modificar tipo y estado de membresía con registro histórico
  async postActualizarMembresia(req, res) {
    const { usuario_id, tipo, estado, motivo } = req.body;
    try {
      let membresia = await Membresia.obtenerPorUsuario(usuario_id);
      if (!membresia) {
        membresia = await Membresia.crear({ usuario_id, tipo });
      }

      await Membresia.actualizarTipoYEstado(membresia.id, tipo, estado, motivo, req.session.usuario.id);
      req.session.mensajeAdmin = 'Membresía actualizada con registro histórico.';
      res.redirect('/admin/socios');
    } catch (err) {
      console.error('Error en postActualizarMembresia:', err);
      req.session.errorAdmin = 'Error al actualizar la membresía.';
      res.redirect('/admin/socios');
    }
  },

  // Restablecer contraseña de socio por soporte técnico
  async postResetPasswordSocio(req, res) {
    const { id } = req.body;
    try {
      const socio = await Usuario.buscarPorId(id);
      if (!socio) {
        req.session.errorAdmin = 'Socio no encontrado.';
        return res.redirect('/admin/socios');
      }

      const tempPassword = 'Club' + Math.floor(1000 + Math.random() * 9000);
      const hash = await bcrypt.hash(tempPassword, 10);
      await Usuario.actualizarPassword(id, hash);

      await enviarCorreo({
        para: socio.correo,
        asunto: 'Soporte Club Valle Alto - Nueva Contraseña Temporal',
        html: `
          <h3>Hola ${socio.nombre_completo},</h3>
          <p>Un administrador ha restablecido tu contraseña por solicitud de soporte.</p>
          <p><strong>Tu nueva contraseña temporal es:</strong> <code style="font-size: 16px;">${tempPassword}</code></p>
          <p>Por favor inicia sesión y cámbiala de inmediato en tu perfil.</p>
        `
      });

      req.session.mensajeAdmin = `Contraseña restablecida exitosamente para ${socio.nombre_completo}. Se le envió la clave temporal (${tempPassword}) a su correo.`;
      res.redirect('/admin/socios');
    } catch (err) {
      console.error('Error en postResetPasswordSocio:', err);
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
      console.error('Error en getInstalaciones:', err);
      res.redirect('/admin/dashboard');
    }
  },

  async postToggleBloqueo(req, res) {
    const { id, motivo } = req.body;
    try {
      await Instalacion.toggleBloqueo(id, motivo || 'Mantenimiento preventivo programado');
      req.session.mensajeInstalaciones = 'Estado de disponibilidad de la instalación modificado.';
      res.redirect('/admin/instalaciones');
    } catch (err) {
      console.error('Error en postToggleBloqueo:', err);
      res.redirect('/admin/instalaciones');
    }
  },

  // Vista de Recepción: control de acceso e invitados diarios
  async getRecepcionInvitados(req, res) {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    try {
      const lista = await Invitado.listarPorFecha(fecha);
      res.render('admin/recepcion', { lista, fecha });
    } catch (err) {
      console.error('Error en getRecepcionInvitados:', err);
      res.redirect('/admin/dashboard');
    }
  },

  // Reporte de uso y demanda de instalaciones (mayor y menor demanda)
  async getReportes(req, res) {
    const inicio = req.query.inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fin = req.query.fin || new Date().toISOString().split('T')[0];

    try {
      const demanda = await Instalacion.reporteDemanda(inicio, fin);
      res.render('admin/reportes', {
        demanda,
        inicio,
        fin
      });
    } catch (err) {
      console.error('Error en getReportes:', err);
      res.redirect('/admin/dashboard');
    }
  }
};

module.exports = adminController;
