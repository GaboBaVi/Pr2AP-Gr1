const db = require('../config/db');

const Instalacion = {
  async listarTodas() {
    const res = await db.query('SELECT * FROM instalaciones ORDER BY id ASC');
    return res.rows;
  },

  async obtenerPorId(id) {
    const res = await db.query('SELECT * FROM instalaciones WHERE id = $1', [id]);
    return res.rows[0];
  },

  async toggleBloqueo(id, motivo) {
    const actual = await this.obtenerPorId(id);
    const nuevoBloqueo = !actual.bloqueada_mantenimiento;
    const res = await db.query(
      'UPDATE instalaciones SET bloqueada_mantenimiento = $1, motivo_bloqueo = $2 WHERE id = $3 RETURNING *',
      [nuevoBloqueo, nuevoBloqueo ? motivo : null, id]
    );
    return res.rows[0];
  },

  async obtenerOcupacionPorDia(fecha) {
    const res = await db.query(
      `SELECT r.id, r.instalacion_id, i.nombre as nombre_instalacion, 
              r.hora_inicio, r.hora_fin, r.num_personas, i.aforo_maximo,
              ROUND((r.num_personas::numeric / i.aforo_maximo::numeric) * 100) as porcentaje_ocupacion
       FROM reservas r
       JOIN instalaciones i ON r.instalacion_id = i.id
       WHERE r.fecha = $1 AND r.estado = 'activa'
       ORDER BY r.hora_inicio ASC`,
      [fecha]
    );
    return res.rows;
  },

  async reporteDemanda(fechaInicio, fechaFin) {
    const res = await db.query(
      `SELECT i.nombre, COUNT(r.id) as total_reservas, COALESCE(SUM(r.num_personas), 0) as total_personas
       FROM instalaciones i
       LEFT JOIN reservas r ON i.id = r.instalacion_id AND r.fecha BETWEEN $1 AND $2 AND r.estado != 'cancelada'
       GROUP BY i.id, i.nombre
       ORDER BY total_reservas DESC`,
      [fechaInicio, fechaFin]
    );
    return res.rows;
  }
};

module.exports = Instalacion;
