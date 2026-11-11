const Reserva = require('../models/reservaModel');
const Invitado = require('../models/invitadoModel');
const Membresia = require('../models/membresiaModel');
const Instalacion = require('../models/instalacionModel');
const Notificacion = require('../models/notificacionModel');
const Cobro = require('../models/cobroModel');
const { enviarCorreo } = require('../config/mailer');

const MAPA_SERVICIOS = {
  'palos_golf': { nombre: 'Alquiler de Palos de Golf', costo: 15000.00 },
  'pelotas_golf': { nombre: 'Alquiler de Pelotas de Golf', costo: 5000.00 },
  'raquetas': { nombre: 'Alquiler de Raquetas de Tenis', costo: 6000.00 },
  'pelotas_tenis': { nombre: 'Alquiler de Pelotas de Tenis', costo: 3000.00 },
  'piscina': { nombre: 'Accesorios para Piscina', costo: 2500.00 },
  'mobiliario': { nombre: 'Montaje de Mobiliario y Sonido', costo: 45000.00 }
};

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
        mensaje: req.session.mensajeReserva || null,
        error: req.session.errorReserva || null
      });
      delete req.session.mensajeReserva;
      delete req.session.errorReserva;
    } catch (err) {
      console.error('Error en getMisReservas:', err);
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
      console.error('Error en getFormularioReserva:', err);
      res.redirect('/socio/reservas');
    }
  },

  async postCrearReserva(req, res) {
    const { 
      instalacion_id, fecha, hora_inicio, hora_fin, num_personas, 
      servicios_adicionales, invitado_cedula, invitado_nombre, invitado_parentesco 
    } = req.body;

    try {
      // 1. Validar disponibilidad y traslapes
      const check = await Reserva.verificarDisponibilidad(instalacion_id, fecha, hora_inicio, hora_fin);
      if (!check.disponible) {
        req.session.errorFormReserva = check.motivo;
        return res.redirect('/socio/reservar');
      }

      // 2. Validar aforo
      if (parseInt(num_personas, 10) > check.instalacion.aforo_maximo) {
        req.session.errorFormReserva = `El aforo máximo permitido para ${check.instalacion.nombre} es de ${check.instalacion.aforo_maximo} personas.`;
        return res.redirect('/socio/reservar');
      }

      // 3. Calcular costo total de servicios adicionales
      let totalServicios = 0;
      const serviciosArray = Array.isArray(servicios_adicionales) 
        ? servicios_adicionales 
        : (servicios_adicionales ? [servicios_adicionales] : []);

      serviciosArray.forEach(clave => {
        if (MAPA_SERVICIOS[clave]) {
          totalServicios += MAPA_SERVICIOS[clave].costo;
        }
      });

      // 4. Crear la reserva
      const nuevaReserva = await Reserva.crear({
        usuario_id: req.session.usuario.id,
        instalacion_id,
        fecha,
        hora_inicio,
        hora_fin,
        num_personas: parseInt(num_personas, 10),
        costo_servicios: totalServicios
      });

      // 5. Guardar los servicios adicionales asociados
      for (const clave of serviciosArray) {
        if (MAPA_SERVICIOS[clave]) {
          await Reserva.agregarServicioSeleccionado(
            nuevaReserva.id, 
            null, 
            MAPA_SERVICIOS[clave].nombre, 
            MAPA_SERVICIOS[clave].costo
          );
        }
      }

      // 6. Actualizar o sumar el costo al estado de cuenta del socio si hubo servicios
      if (totalServicios > 0) {
        await Cobro.agregarCargosServicio(req.session.usuario.id, totalServicios);
      }

      // 7. Registrar invitado si fue ingresado (Paso #4)
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

      // 8. Notificar al socio por correo
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

      req.session.mensajeReserva = '¡Reserva confirmada con éxito! Se ha enviado el comprobante a tu correo.';
      res.redirect('/socio/reservas');
    } catch (err) {
      console.error('Error en postCrearReserva:', err);
      req.session.errorFormReserva = 'Error interno al procesar la reserva.';
      res.redirect('/socio/reservar');
    }
  },

  // Vista para modificar reserva activa
  async getEditarReserva(req, res) {
    const { id } = req.params;
    try {
      const reserva = await Reserva.obtenerPorId(id);
      if (!reserva || reserva.usuario_id !== req.session.usuario.id || reserva.estado !== 'activa') {
        req.session.errorReserva = 'No se encontró la reserva o no se puede modificar en su estado actual.';
        return res.redirect('/socio/reservas');
      }

      const instalaciones = await Instalacion.listarTodas();
      res.render('socio/editar-reserva', {
        reserva,
        instalaciones,
        error: req.session.errorEditarReserva || null
      });
      delete req.session.errorEditarReserva;
    } catch (err) {
      console.error('Error en getEditarReserva:', err);
      res.redirect('/socio/reservas');
    }
  },

  // Procesar modificación de reserva
  async postEditarReserva(req, res) {
    const { id } = req.params;
    const { instalacion_id, fecha, hora_inicio, hora_fin, num_personas, servicios_adicionales } = req.body;

    try {
      // 1. Validar disponibilidad excluyendo la misma reserva
      const check = await Reserva.verificarDisponibilidad(instalacion_id, fecha, hora_inicio, hora_fin, id);
      if (!check.disponible) {
        req.session.errorEditarReserva = check.motivo;
        return res.redirect(`/socio/reservas/editar/${id}`);
      }

      // 2. Validar aforo
      if (parseInt(num_personas, 10) > check.instalacion.aforo_maximo) {
        req.session.errorEditarReserva = `El aforo máximo para ${check.instalacion.nombre} es de ${check.instalacion.aforo_maximo} personas.`;
        return res.redirect(`/socio/reservas/editar/${id}`);
      }

      // 3. Recalcular servicios
      let totalServicios = 0;
      const serviciosArray = Array.isArray(servicios_adicionales) 
        ? servicios_adicionales 
        : (servicios_adicionales ? [servicios_adicionales] : []);

      serviciosArray.forEach(clave => {
        if (MAPA_SERVICIOS[clave]) {
          totalServicios += MAPA_SERVICIOS[clave].costo;
        }
      });

      // 4. Actualizar reserva
      await Reserva.actualizar({
        id,
        usuario_id: req.session.usuario.id,
        instalacion_id,
        fecha,
        hora_inicio,
        hora_fin,
        num_personas: parseInt(num_personas, 10),
        costo_servicios: totalServicios
      });

      // 5. Actualizar servicios asociados
      await Reserva.limpiarServiciosSeleccionados(id);
      for (const clave of serviciosArray) {
        if (MAPA_SERVICIOS[clave]) {
          await Reserva.agregarServicioSeleccionado(id, null, MAPA_SERVICIOS[clave].nombre, MAPA_SERVICIOS[clave].costo);
        }
      }

      req.session.mensajeReserva = 'Tu reserva ha sido modificada y actualizada exitosamente.';
      res.redirect('/socio/reservas');
    } catch (err) {
      console.error('Error en postEditarReserva:', err);
      req.session.errorEditarReserva = 'Error interno al actualizar la reserva.';
      res.redirect(`/socio/reservas/editar/${id}`);
    }
  },

  async postCancelarReserva(req, res) {
    const { id } = req.body;
    try {
      const reserva = await Reserva.obtenerPorId(id);
      const cancelada = await Reserva.cancelar(id, req.session.usuario.id);

      if (cancelada) {
        // Enviar correo de cancelación
        const plantilla = await Notificacion.obtenerPlantilla('reserva_cancelada');
        if (plantilla) {
          let cuerpo = plantilla.cuerpo
            .replace('{{nombre}}', req.session.usuario.nombre)
            .replace('{{instalacion}}', reserva?.nombre_instalacion || 'Instalación')
            .replace('{{fecha}}', reserva?.fecha ? new Date(reserva.fecha).toLocaleDateString() : '');

          await enviarCorreo({
            para: req.session.usuario.correo,
            asunto: plantilla.asunto,
            html: `<p>${cuerpo}</p>`
          });

          await Notificacion.registrarEnBitacora({
            usuario_id: req.session.usuario.id,
            tipo_notificacion: 'Cancelacion de Reserva',
            destinatario_correo: req.session.usuario.correo,
            asunto: plantilla.asunto
          });
        }
        req.session.mensajeReserva = 'Reserva cancelada correctamente.';
      } else {
        req.session.errorReserva = 'No se pudo cancelar la reserva.';
      }

      res.redirect('/socio/reservas');
    } catch (err) {
      console.error('Error en postCancelarReserva:', err);
      res.redirect('/socio/reservas');
    }
  }
};

module.exports = reservaController;
