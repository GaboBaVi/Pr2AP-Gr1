const db = require('../config/db');

const Invitado = {
  async contarInvitadosMes(usuarioId) {
    const res = await db.query(
      `SELECT COUNT(*) FROM invitados 
       WHERE usuario_id = $1 
         AND EXTRACT(MONTH FROM fecha_visita) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM fecha_visita) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [usuarioId]
    );
    return parseInt(res.rows[0].count, 10);
  },

  async registrar({ usuario_id, instalacion_id, reserva_id, cedula, nombre_completo, fecha_visita, parentesco_relacion }) {
    const res = await db.query(
      `INSERT INTO invitados (usuario_id, instalacion_id, reserva_id, cedula, nombre_completo, fecha_visita, parentesco_relacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [usuario_id, instalacion_id, reserva_id, cedula, nombre_completo, fecha_visita, parentesco_relacion]
    );
    return res.rows[0];
  },

  async listarPorFecha(fecha) {
    const res = await db.query(
      `SELECT inv.*, u.nombre_completo as nombre_socio, u.cedula as cedula_socio, i.nombre as nombre_instalacion
       FROM invitados inv
       JOIN usuarios u ON inv.usuario_id = u.id
       LEFT JOIN instalaciones i ON inv.instalacion_id = i.id
       WHERE inv.fecha_visita = $1
       ORDER BY inv.created_at ASC`,
      [fecha]
    );
    return res.rows;
  }
};

module.exports = Invitado;
