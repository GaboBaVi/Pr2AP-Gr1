const db = require('../config/db');

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

  async verificarDisponibilidad(instalacionId, fecha, horaInicio, horaFin, idExcluir = null) {
    // 1. Verificar si la instalación está bloqueada por mantenimiento
    const inst = await db.query('SELECT * FROM instalaciones WHERE id = $1', [instalacionId]);
    if (!inst.rows[0] || inst.rows[0].bloqueada_mantenimiento) {
      return { 
        disponible: false, 
        motivo: `La instalación ${inst.rows[0]?.nombre || ''} está bloqueada por mantenimiento o evento privado.` 
      };
    }

    // 2. Horarios de apertura y cierre
    const apertura = inst.rows[0].hora_apertura;
    const cierre = inst.rows[0].hora_cierre;
    if (horaInicio < apertura || horaFin > cierre) {
      return { 
        disponible: false, 
        motivo: `El horario solicitado debe encontrarse entre ${apertura} y ${cierre}.` 
      };
    }

    if (horaInicio >= horaFin) {
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
        motivo: 'Conflicto de horario: Ya existe una reserva confirmada en la franja solicitada.' 
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

  async obtenerServiciosDisponibles(instalacionId) {
    const res = await db.query(
      'SELECT * FROM servicios_adicionales_disponibles WHERE instalacion_id = $1 ORDER BY id ASC',
      [instalacionId]
    );
    return res.rows;
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
