const db = require('../config/db');

const Membresia = {
  async obtenerPorUsuario(usuarioId) {
    const res = await db.query('SELECT * FROM membresias WHERE usuario_id = $1', [usuarioId]);
    return res.rows[0];
  },

  async crear({ usuario_id, tipo, monto_cuota, limite_invitados_mes, limite_beneficiarios }) {
    const res = await db.query(
      `INSERT INTO membresias (usuario_id, tipo, monto_cuota, limite_invitados_mes, limite_beneficiarios, estado, fecha_inscripcion, fecha_renovacion)
       VALUES ($1, $2, $3, $4, $5, 'activa', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
       RETURNING *`,
      [usuario_id, tipo, monto_cuota || 35000, limite_invitados_mes || 5, limite_beneficiarios || 4]
    );
    return res.rows[0];
  },

  async actualizarTipoYEstado(membresiaId, nuevoTipo, nuevoEstado, motivo, adminId) {
    const actual = await db.query('SELECT * FROM membresias WHERE id = $1', [membresiaId]);
    const estadoAnterior = actual.rows[0] ? actual.rows[0].estado : null;

    const res = await db.query(
      `UPDATE membresias 
       SET tipo = $1, estado = $2 
       WHERE id = $3 
       RETURNING *`,
      [nuevoTipo, nuevoEstado, membresiaId]
    );

    await db.query(
      `INSERT INTO historial_membresias (membresia_id, estado_anterior, estado_nuevo, motivo, usuario_admin_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [membresiaId, estadoAnterior, nuevoEstado, motivo || 'Actualización administrativa', adminId]
    );

    return res.rows[0];
  },

  async obtenerHistorial(membresiaId) {
    const res = await db.query(
      `SELECT h.*, u.nombre_completo as admin_nombre
       FROM historial_membresias h
       LEFT JOIN usuarios u ON h.usuario_admin_id = u.id
       WHERE h.membresia_id = $1
       ORDER BY h.fecha_cambio DESC`,
      [membresiaId]
    );
    return res.rows;
  },

  async obtenerBeneficiarios(membresiaId) {
    const res = await db.query('SELECT * FROM beneficiarios WHERE membresia_id = $1', [membresiaId]);
    return res.rows;
  },

  async contarBeneficiarios(membresiaId) {
    const res = await db.query('SELECT COUNT(*) FROM beneficiarios WHERE membresia_id = $1', [membresiaId]);
    return parseInt(res.rows[0].count, 10);
  },

  async agregarBeneficiario({ membresia_id, cedula, nombre_completo, parentesco, fecha_nacimiento }) {
    const res = await db.query(
      `INSERT INTO beneficiarios (membresia_id, cedula, nombre_completo, parentesco, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [membresia_id, cedula, nombre_completo, parentesco, fecha_nacimiento]
    );
    return res.rows[0];
  },

  async actualizarBeneficiario(id, membresiaId, { cedula, nombre_completo, parentesco, fecha_nacimiento }) {
    const res = await db.query(
      `UPDATE beneficiarios 
       SET cedula = $1, nombre_completo = $2, parentesco = $3, fecha_nacimiento = $4
       WHERE id = $5 AND membresia_id = $6
       RETURNING *`,
      [cedula, nombre_completo, parentesco, fecha_nacimiento, id, membresiaId]
    );
    return res.rows[0];
  },

  async eliminarBeneficiario(id, membresiaId) {
    const res = await db.query(
      `DELETE FROM beneficiarios 
       WHERE id = $1 AND membresia_id = $2
       RETURNING *`,
      [id, membresiaId]
    );
    return res.rows[0];
  }
};

module.exports = Membresia;
