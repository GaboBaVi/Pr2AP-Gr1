const db = require('../config/db');

// Función auxiliar para comparar horas sin importar si traen segundos o no
function horaEnMinutos(h) {
  if (!h) return 0;
  const parts = h.slice(0, 5).split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

const Reserva = {
  async obtenerPorId(id) {
    const res = await db.query(
      `SELECT r.*, i.nombre as nombre_instalacion, i.aforo_maximo, i.hora_apertura, i.hora_cierre
       FROM reservas r
       JOIN instalaciones i ON r.instalacion_id = i.id
       WHERE r.id = $1`,
      [id]
    );
    return res.rows[0];
  },

  async listarPorUsuario(usuarioId, estado = null) {
    let sql = `
      SELECT r.*, i.nombre as nombre_instalacion,
             (SELECT json_agg(json_build_object('nombre', inv.nombre_completo, 'cedula', inv.cedula))
              FROM invitados inv WHERE inv.reserva_id = r.id) as lista_invitados
      FROM reservas r
      JOIN instalaciones i ON r.instalacion_id = i.id
      WHERE r.usuario_id = $1
    `;
    const params = [usuarioId];
    if (estado) {
      sql += ' AND r.estado = $2';
      params.push(estado);
    }
    sql += ' ORDER BY r.fecha DESC, r.hora_inicio DESC';
    const res = await db.query(sql, params);
    return res.rows;
  },

  async verificarDisponibilidad(instalacionId, fecha, horaInicio, horaFin, idExcluir = null) {
    const minutosInicio = horaEnMinutos(horaInicio);
    const minutosFin = horaEnMinutos(horaFin);

    // 0. Validar que la fecha y hora no pertenezcan al pasado (Zona Horaria Costa Rica)
    const ahora = new Date();
    const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(ahora); // YYYY-MM-DD
    const horaActualCR = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', hour12: false }).format(ahora); // HH:mm
    const minutosActuales = horaEnMinutos(horaActualCR);

    if (fecha < hoyStr) {
      return { 
        disponible: false, 
        motivo: 'No es posible realizar o modificar una reserva en una fecha pasada.' 
      };
    }

    if (fecha === hoyStr && minutosInicio <= minutosActuales) {
      return { 
        disponible: false, 
        motivo: `La hora de inicio (${horaInicio}) ya ha transcurrido el día de hoy. Por favor selecciona una hora posterior a las ${horaActualCR}.` 
      };
    }

    // 1. Verificar si la instalación está bloqueada por mantenimiento
    const inst = await db.query('SELECT * FROM instalaciones WHERE id = $1', [instalacionId]);
    if (!inst.rows[0]) {
      return { disponible: false, motivo: 'Instalación no encontrada.' };
    }
    const instData = inst.rows[0];
    if (instData.bloqueada_mantenimiento) {
      const fechaInstStr = instData.mantenimiento_fecha 
        ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date(instData.mantenimiento_fecha))
        : null;

      // Solo aplica si coincide con la fecha seleccionada
      if (!fechaInstStr || fechaInstStr === fecha) {
        if (instData.mantenimiento_tipo === 'horas' && instData.mantenimiento_hora_inicio && instData.mantenimiento_hora_fin) {
          const mInicioMin = horaEnMinutos(instData.mantenimiento_hora_inicio);
          const mFinMin = horaEnMinutos(instData.mantenimiento_hora_fin);
          if (minutosInicio < mFinMin && minutosFin > mInicioMin) {
            return {
              disponible: false,
              motivo: `La instalación ${instData.nombre} se encuentra en mantenimiento en el horario de ${instData.mantenimiento_hora_inicio.slice(0,5)} a ${instData.mantenimiento_hora_fin.slice(0,5)} para la fecha seleccionada.`
            };
          }
        } else {
          return { 
            disponible: false, 
            motivo: `La instalación ${instData.nombre} está bloqueada por mantenimiento durante todo el día para la fecha seleccionada.` 
          };
        }
      }
    }

    const aperturaMin = horaEnMinutos(inst.rows[0].hora_apertura);
    const cierreMin = horaEnMinutos(inst.rows[0].hora_cierre);

    // 2. Horarios de apertura y cierre (Permisivo e inclusivo: inicio >= apertura && fin <= cierre)
    if (minutosInicio < aperturaMin || minutosFin > cierreMin) {
      return { 
        disponible: false, 
        motivo: `El horario solicitado debe encontrarse entre ${inst.rows[0].hora_apertura.slice(0,5)} y ${inst.rows[0].hora_cierre.slice(0,5)}.` 
      };
    }

    if (minutosInicio >= minutosFin) {
      return {
        disponible: false,
        motivo: 'La hora de inicio debe ser anterior a la hora de finalización.'
      };
    }

    // 3. Traslapes con otras reservas confirmadas
    let sqlTraslape = `
      SELECT * FROM reservas
      WHERE instalacion_id = $1 
        AND fecha = $2 
        AND estado = 'activa'
        AND (hora_inicio < $4 AND hora_fin > $3)
    `;
    const params = [instalacionId, fecha, horaInicio, horaFin];

    if (idExcluir) {
      sqlTraslape += ' AND id != $5';
      params.push(idExcluir);
    }

    const traslapes = await db.query(sqlTraslape, params);

    if (traslapes.rows.length > 0) {
      return { 
        disponible: false, 
        motivo: 'Conflicto de horario: Ya existe una reserva confirmada en la franja horaria solicitada.' 
      };
    }

    return { disponible: true, instalacion: inst.rows[0] };
  },

  async crear({ usuario_id, instalacion_id, fecha, hora_inicio, hora_fin, num_personas, costo_servicios }) {
    const res = await db.query(
      `INSERT INTO reservas (usuario_id, instalacion_id, fecha, hora_inicio, hora_fin, num_personas, costo_servicios, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'activa')
       RETURNING *`,
      [usuario_id, instalacion_id, fecha, hora_inicio, hora_fin, num_personas, costo_servicios || 0]
    );
    return res.rows[0];
  },

  async actualizar({ id, usuario_id, instalacion_id, fecha, hora_inicio, hora_fin, num_personas, costo_servicios }) {
    const res = await db.query(
      `UPDATE reservas
       SET instalacion_id = $1, fecha = $2, hora_inicio = $3, hora_fin = $4, num_personas = $5, costo_servicios = $6
       WHERE id = $7 AND usuario_id = $8 AND estado = 'activa'
       RETURNING *`,
      [instalacion_id, fecha, hora_inicio, hora_fin, num_personas, costo_servicios || 0, id, usuario_id]
    );
    return res.rows[0];
  },

  async cancelar(id, usuarioId) {
    const res = await db.query(
      `UPDATE reservas 
       SET estado = 'cancelada' 
       WHERE id = $1 AND usuario_id = $2 AND estado = 'activa'
       RETURNING *`,
      [id, usuarioId]
    );
    return res.rows[0];
  },

  async limpiarServiciosSeleccionados(reservaId) {
    await db.query('DELETE FROM reserva_servicios_seleccionados WHERE reserva_id = $1', [reservaId]);
  },

  async agregarServicioSeleccionado(reservaId, servicioId, nombre, costo) {
    await db.query(
      `INSERT INTO reserva_servicios_seleccionados (reserva_id, servicio_id, nombre_servicio, costo)
       VALUES ($1, $2, $3, $4)`,
      [reservaId, servicioId, nombre, costo]
    );
  },

  async obtenerServiciosSeleccionados(reservaId) {
    const res = await db.query(
      'SELECT * FROM reserva_servicios_seleccionados WHERE reserva_id = $1',
      [reservaId]
    );
    return res.rows;
  }
};

module.exports = Reserva;
