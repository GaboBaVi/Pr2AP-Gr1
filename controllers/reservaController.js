const Reserva = require('../models/reservaModel');
const Invitado = require('../models/invitadoModel');
const Membresia = require('../models/membresiaModel');
const Instalacion = require('../models/instalacionModel');
const Notificacion = require('../models/notificacionModel');
const Cobro = require('../models/cobroModel');
const { enviarCorreo } = require('../config/mailer');
const db = require('../config/db');

function horaEnMinutos(h) {
  if (!h) return 0;
  const parts = h.slice(0, 5).split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

const MAPA_SERVICIOS = {
  'palos_golf': { nombre: 'Alquiler de Palos de Golf', costo: 15000.00, instalacion_id: 1 },
  'pelotas_golf': { nombre: 'Alquiler de Pelotas de Golf', costo: 5000.00, instalacion_id: 1 },
  'raquetas': { nombre: 'Alquiler de Raquetas de Tenis', costo: 6000.00, instalacion_id: 2 },
  'pelotas_tenis': { nombre: 'Alquiler de Pelotas de Tenis', costo: 3000.00, instalacion_id: 2 },
  'piscina': { nombre: 'Accesorios para Piscina', costo: 2500.00, instalacion_id: 3 },
  'mobiliario': { nombre: 'Montaje de Mobiliario y Sonido', costo: 45000.00, instalacion_id: 4 }
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
      const datosPrevios = req.session.datosFormReserva || {};
      delete req.session.datosFormReserva;

      res.render('socio/reservar', {
        instalaciones,
        datosPrevios,
        error: req.session.errorFormReserva || null
      });
      delete req.session.errorFormReserva;
    } catch (err) {
      console.error('Error en getFormularioReserva:', err);
      res.redirect('/socio/reservas');
    }
  },

  async getDisponibilidadHoraria(req, res) {
    const { instalacion_id, fecha, reserva_id } = req.query;
    try {
      if (!instalacion_id || !fecha) {
        return res.json({ disponible: false, slots: [], motivo: 'Selecciona una instalación y fecha.' });
      }

      const inst = await Instalacion.obtenerPorId(instalacion_id);
      if (!inst) {
        return res.json({ disponible: false, slots: [], motivo: 'Instalación no encontrada.' });
      }

      const ahora = new Date();
      const hoyCR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(ahora);
      if (fecha < hoyCR) {
        return res.json({ disponible: false, slots: [], motivo: 'La fecha seleccionada ya pasó.' });
      }

      const fechaConsultaStr = fecha;
      const fechaInstStr = inst.mantenimiento_fecha 
        ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date(inst.mantenimiento_fecha))
        : hoyCR;

      // Mantenimiento todo el día SOLO para la fecha bloqueada
      if (inst.bloqueada_mantenimiento) {
        if (fechaInstStr === fechaConsultaStr) {
          if (!inst.mantenimiento_tipo || inst.mantenimiento_tipo === 'todo_el_dia') {
            return res.json({
              disponible: false,
              bloqueada_total: true,
              motivo: `La instalación ${inst.nombre} se encuentra en mantenimiento durante todo el día para la fecha seleccionada (${inst.motivo_bloqueo || 'Mantenimiento preventivo'}). Por favor selecciona otra fecha.`
            });
          }
        }
      }

      const horaAperturaNum = parseInt(inst.hora_apertura.slice(0, 2), 10);
      const horaCierreNum = parseInt(inst.hora_cierre.slice(0, 2), 10);

      let sqlReservas = `
        SELECT id, hora_inicio, hora_fin, num_personas 
        FROM reservas 
        WHERE instalacion_id = $1 AND fecha = $2 AND estado = 'activa'
      `;
      const params = [instalacion_id, fecha];
      if (reserva_id) {
        sqlReservas += ' AND id != $3';
        params.push(reserva_id);
      }
      const reservasDb = await db.query(sqlReservas, params);

      const horaCR = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', hour12: false }).format(ahora);
      const horaActualMinutos = horaEnMinutos(horaCR);

      const slotsDisponibles = [];

      for (let h = horaAperturaNum; h < horaCierreNum; h++) {
        const hInicioStr = (h < 10 ? '0' : '') + h + ':00';
        const hFinStr = ((h + 1) < 10 ? '0' : '') + (h + 1) + ':00';
        const inicioMin = h * 60;
        const finMin = (h + 1) * 60;

        // Validar si la hora ya pasó hoy
        if (fecha === hoyCR && inicioMin <= horaActualMinutos) {
          continue; // Ya pasó: no sale
        }

        // Validar mantenimiento por horas (solo si coincide la fecha)
        if (inst.bloqueada_mantenimiento && inst.mantenimiento_tipo === 'horas') {
          if (fechaInstStr === fechaConsultaStr) {
            const mInicioMin = horaEnMinutos(inst.mantenimiento_hora_inicio);
            const mFinMin = horaEnMinutos(inst.mantenimiento_hora_fin);
            if (inicioMin < mFinMin && finMin > mInicioMin) {
              continue; // En mantenimiento: no sale
            }
          }
        }

        // Validar reservas previas
        let ocupado = false;
        let personasEnSlot = 0;
        for (const r of reservasDb.rows) {
          const rInicioMin = horaEnMinutos(r.hora_inicio);
          const rFinMin = horaEnMinutos(r.hora_fin);
          if (inicioMin < rFinMin && finMin > rInicioMin) {
            personasEnSlot += Number(r.num_personas);
            if (inst.aforo_maximo <= 25) {
              ocupado = true;
              break;
            }
          }
        }

        if (ocupado || personasEnSlot >= inst.aforo_maximo) {
          continue; // Ya reservada: no sale
        }

        const format12 = (str) => {
          let num = parseInt(str.slice(0, 2), 10);
          const ampm = num >= 12 ? 'pm' : 'am';
          num = num % 12 || 12;
          return `${num}:00 ${ampm}`;
        };

        slotsDisponibles.push({
          inicio: hInicioStr,
          fin: hFinStr,
          hora_inicio: hInicioStr,
          hora_fin: hFinStr,
          label: `${format12(hInicioStr)} - ${format12(hFinStr)}`,
          hora: h
        });
      }

      res.json({
        disponible: true,
        bloqueada_total: false,
        slots: slotsDisponibles,
        aforo_maximo: inst.aforo_maximo,
        hora_apertura: inst.hora_apertura.slice(0, 5),
        hora_cierre: inst.hora_cierre.slice(0, 5)
      });
    } catch (err) {
      console.error('Error en getDisponibilidadHoraria:', err);
      res.status(500).json({ disponible: false, slots: [], error: 'Error interno' });
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
        req.session.datosFormReserva = req.body;
        return res.redirect('/socio/reservar');
      }

      // 2. Validar aforo
      if (parseInt(num_personas, 10) > check.instalacion.aforo_maximo) {
        req.session.errorFormReserva = `El aforo máximo permitido para ${check.instalacion.nombre} es de ${check.instalacion.aforo_maximo} personas. No es posible reservar para ${num_personas} personas.`;
        req.session.datosFormReserva = req.body;
        return res.redirect('/socio/reservar');
      }

      // 3. Validar cédulas de invitados si fueron provistas
      const nombresArray = Array.isArray(invitado_nombre) 
        ? invitado_nombre 
        : (invitado_nombre ? [invitado_nombre] : []);
      const cedulasArray = Array.isArray(invitado_cedula) 
        ? invitado_cedula 
        : (invitado_cedula ? [invitado_cedula] : []);
      const parentescosArray = Array.isArray(invitado_parentesco) 
        ? invitado_parentesco 
        : (invitado_parentesco ? [invitado_parentesco] : []);

      const regexCedula = /^(?:[1-9]-?\d{4}-?\d{4}|\d{9}|\d{11,12})$/;
      for (let i = 0; i < cedulasArray.length; i++) {
        const ced = cedulasArray[i] ? cedulasArray[i].trim() : '';
        if (ced && !regexCedula.test(ced)) {
          req.session.errorFormReserva = `La cédula del invitado "${ced}" no tiene un formato válido costarricense (ej. 1-1234-0567 o 9 dígitos).`;
          req.session.datosFormReserva = req.body;
          return res.redirect('/socio/reservar');
        }
      }

      // 4. Calcular costo total de servicios adicionales
      let totalServicios = 0;
      const serviciosArray = Array.isArray(servicios_adicionales) 
        ? servicios_adicionales 
        : (servicios_adicionales ? [servicios_adicionales] : []);

      serviciosArray.forEach(clave => {
        if (MAPA_SERVICIOS[clave] && String(MAPA_SERVICIOS[clave].instalacion_id) === String(instalacion_id)) {
          totalServicios += MAPA_SERVICIOS[clave].costo;
        }
      });

      // 5. Crear la reserva
      const nuevaReserva = await Reserva.crear({
        usuario_id: req.session.usuario.id,
        instalacion_id,
        fecha,
        hora_inicio,
        hora_fin,
        num_personas: parseInt(num_personas, 10),
        costo_servicios: totalServicios
      });

      // 6. Guardar los servicios adicionales asociados
      for (const clave of serviciosArray) {
        if (MAPA_SERVICIOS[clave] && String(MAPA_SERVICIOS[clave].instalacion_id) === String(instalacion_id)) {
          await Reserva.agregarServicioSeleccionado(
            nuevaReserva.id, 
            null, 
            MAPA_SERVICIOS[clave].nombre, 
            MAPA_SERVICIOS[clave].costo
          );
        }
      }

      // 7. Actualizar el estado de cuenta del socio recalculando cargos reales
      await Cobro.recalcularCargosMes(req.session.usuario.id);

      // 8. Registrar todos los invitados ingresados (Paso #4)
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      const limite = membresia ? membresia.limite_invitados_mes : 5;
      let totalMes = await Invitado.contarInvitadosMes(req.session.usuario.id);

      for (let i = 0; i < nombresArray.length; i++) {
        const nom = nombresArray[i] ? nombresArray[i].trim() : '';
        const ced = cedulasArray[i] ? cedulasArray[i].trim() : '';
        const par = parentescosArray[i] ? parentescosArray[i].trim() : 'amigo';

        if (nom && ced) {
          if (totalMes < limite) {
            await Invitado.registrar({
              usuario_id: req.session.usuario.id,
              instalacion_id,
              reserva_id: nuevaReserva.id,
              cedula: ced,
              nombre_completo: nom,
              fecha_visita: fecha,
              parentesco_relacion: par || 'amigo'
            });
            totalMes++;
          }
        }
      }

      // 9. Notificar al socio por correo
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
      req.session.datosFormReserva = req.body;
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
      const serviciosPrevios = await Reserva.obtenerServiciosSeleccionados(id);

      res.render('socio/editar-reserva', {
        reserva,
        instalaciones,
        serviciosPrevios: serviciosPrevios.map(s => s.nombre_servicio),
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
        req.session.errorEditarReserva = `El aforo máximo para ${check.instalacion.nombre} es de ${check.instalacion.aforo_maximo} personas. No es posible reservar para ${num_personas} personas.`;
        return res.redirect(`/socio/reservas/editar/${id}`);
      }

      // 3. Recalcular servicios
      let totalServicios = 0;
      const serviciosArray = Array.isArray(servicios_adicionales) 
        ? servicios_adicionales 
        : (servicios_adicionales ? [servicios_adicionales] : []);

      serviciosArray.forEach(clave => {
        if (MAPA_SERVICIOS[clave] && String(MAPA_SERVICIOS[clave].instalacion_id) === String(instalacion_id)) {
          totalServicios += MAPA_SERVICIOS[clave].costo;
        }
      });

      // Obtener costo anterior para ajustar cobros
      const reservaAnterior = await Reserva.obtenerPorId(id);
      const diferenciaCargos = totalServicios - Number(reservaAnterior.costo_servicios || 0);

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
        if (MAPA_SERVICIOS[clave] && String(MAPA_SERVICIOS[clave].instalacion_id) === String(instalacion_id)) {
          await Reserva.agregarServicioSeleccionado(id, null, MAPA_SERVICIOS[clave].nombre, MAPA_SERVICIOS[clave].costo);
        }
      }

      // 6. Ajustar estado de cuenta recalculando cargos reales
      await Cobro.recalcularCargosMes(req.session.usuario.id);

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
        // Descontar cobro de servicios adicionales recalculando el mes
        await Cobro.recalcularCargosMes(req.session.usuario.id);

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
        req.session.mensajeReserva = 'Reserva cancelada correctamente. Cualquier cargo adicional asociado fue reembolsado a tu estado de cuenta.';
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
