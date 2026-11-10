const db = require('../config/db');

const Reserva = {
  async listarPorUsuario(usuarioId, estado = null) {
    let sql = `
      SELECT r.*, i.nombre as nombre_instalacion
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

  async verificarDisponibilidad(instalacionId, fecha, horaInicio, horaFin) {
    // 1. Verificar si la instalacion esta bloqueada por mantenimiento
    const inst = await db.query('SELECT * FROM instalaciones WHERE id = $1', [instalacionId]);
    if (!inst.rows[0] || inst.rows[0].bloqueada_mantenimiento) {
      return { disponible: false, motivo: 'La instalacion se encuentra bloqueada por mantenimiento o eventos privados.' };
    }

    // 2. Verificar horarios de apertura y cierre
    const apertura = inst.rows[0].hora_apertura;
    const cierre = inst.rows[0].hora_cierre;
    if (horaInicio < apertura || horaFin > cierre) {
      return { disponible: false, motivo: `El horario debe estar entre ${apertura} y ${cierre}.` };
    }

    // 3. Verificar traslapes con otras reservas confirmadas/activas
    const traslapes = await db.query(
      `SELECT * FROM reservas
       WHERE instalacion_id = $1 
         AND fecha = $2 
         AND estado = 'activa'
         AND (hora_inicio < $4 AND hora_fin > $3)`,
      [instalacionId, fecha, horaInicio, horaFin]
    );

    if (traslapes.rows.length > 0) {
      return { disponible: false, motivo: 'Ya existe una reserva confirmada en este rango de horario.' };
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

  async obtenerServiciosDisponibles(instalacionId) {
    const res = await db.query(
      'SELECT * FROM servicios_adicionales_disponibles WHERE instalacion_id = $1',
      [instalacionId]
    );
    return res.rows;
  },

  async agregarServicioSeleccionado(reservaId, servicioId, nombre, costo) {
    await db.query(
      `INSERT INTO reserva_servicios_seleccionados (reserva_id, servicio_id, nombre_servicio, costo)
       VALUES ($1, $2, $3, $4)`,
      [reservaId, servicioId, nombre, costo]
    );
  }
};

module.exports = Reserva;
