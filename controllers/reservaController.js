const Reserva = require('../models/reservaModel');
const Invitado = require('../models/invitadoModel');
const Membresia = require('../models/membresiaModel');
const Instalacion = require('../models/instalacionModel');
const Notificacion = require('../models/notificacionModel');
const { enviarCorreo } = require('../config/mailer');

const reservaController = {
  async getDashboard(req, res) {
    res.render('socio/dashboard', { usuario: req.session.usuario });
  },

  async getMisReservas(req, res) {
    const estado = req.query.estado || 'activa';
    try {
      const reservas = await Reserva.listarPorUsuario(req.session.usuario.id, estado);
      const totalInvitadosMes = await Invitado.contarInvitadosMes(req.session.usuario.id);
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      const limiteInvitados = membresia ? membresia.limite_invitados_mes : 5;

      res.render('socio/reservas', {
        reservas,
        estadoActual: estado,
        totalInvitadosMes,
        limiteInvitados,
        mensaje: req.session.mensajeReserva || null
      });
      delete req.session.mensajeReserva;
    } catch (err) {
      console.error(err);
      res.redirect('/socio/dashboard');
    }
  },

  async getFormularioReserva(req, res) {
    try {
      const instalaciones = await Instalacion.listarTodas();
      res.render('socio/reservar', {
        instalaciones,
        error: req.session.errorFormReserva || null
      });
      delete req.session.errorFormReserva;
    } catch (err) {
      console.error(err);
      res.redirect('/socio/reservas');
    }
  },

  async postCrearReserva(req, res) {
    const { instalacion_id, fecha, hora_inicio, hora_fin, num_personas, servicios_adicionales, invitado_cedula, invitado_nombre, invitado_parentesco } = req.body;
    try {
      // 1. Validar disponibilidad y traslapes
      const check = await Reserva.verificarDisponibilidad(instalacion_id, fecha, hora_inicio, hora_fin);
      if (!check.disponible) {
        req.session.errorFormReserva = check.motivo;
        return res.redirect('/socio/reservar');
      }

      // 2. Validar aforo
      if (parseInt(num_personas, 10) > check.instalacion.aforo_maximo) {
        req.session.errorFormReserva = `El aforo maximo permitido para ${check.instalacion.nombre} es de ${check.instalacion.aforo_maximo} personas.`;
        return res.redirect('/socio/reservar');
      }

      // 3. Crear reserva
      const nuevaReserva = await Reserva.crear({
        usuario_id: req.session.usuario.id,
        instalacion_id,
        fecha,
        hora_inicio,
        hora_fin,
        num_personas: parseInt(num_personas, 10),
        costo_servicios: 0 // Se suma si selecciono servicios
      });

      // 4. Registrar invitado si fue ingresado (Paso #4)
      if (invitado_cedula && invitado_nombre) {
        const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
        const limite = membresia ? membresia.limite_invitados_mes : 5;
        const totalMes = await Invitado.contarInvitadosMes(req.session.usuario.id);

        if (totalMes < limite) {
          await Invitado.registrar({
            usuario_id: req.session.usuario.id,
            instalacion_id,
            reserva_id: nuevaReserva.id,
            cedula: invitado_cedula,
            nombre_completo: invitado_nombre,
            fecha_visita: fecha,
            parentesco_relacion: invitado_parentesco || 'amigo'
          });
        }
      }

      // 5. Notificar al socio por correo
      const plantilla = await Notificacion.obtenerPlantilla('reserva_confirmada');
      if (plantilla) {
        let cuerpo = plantilla.cuerpo
          .replace('{{nombre}}', req.session.usuario.nombre)
          .replace('{{instalacion}}', check.instalacion.nombre)
          .replace('{{fecha}}', fecha)
          .replace('{{hora_inicio}}', hora_inicio)
          .replace('{{hora_fin}}', hora_fin);

        await enviarCorreo({
          para: req.session.usuario.correo,
          asunto: plantilla.asunto,
          html: `<p>${cuerpo}</p>`
        });

        await Notificacion.registrarEnBitacora({
          usuario_id: req.session.usuario.id,
          tipo_notificacion: 'Confirmacion de Reserva',
          destinatario_correo: req.session.usuario.correo,
          asunto: plantilla.asunto
        });
      }

      req.session.mensajeReserva = 'Reserva realizada exitosamente.';
      res.redirect('/socio/reservas');
    } catch (err) {
      console.error(err);
      req.session.errorFormReserva = 'Error interno al procesar la reserva.';
      res.redirect('/socio/reservar');
    }
  },

  async postCancelarReserva(req, res) {
    const { id } = req.body;
    try {
      await Reserva.cancelar(id, req.session.usuario.id);
      req.session.mensajeReserva = 'Reserva cancelada correctamente.';
      res.redirect('/socio/reservas');
    } catch (err) {
      console.error(err);
      res.redirect('/socio/reservas');
    }
  }
};

module.exports = reservaController;
