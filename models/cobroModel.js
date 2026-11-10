const db = require('../config/db');

const Cobro = {
  async obtenerEstadoActual(usuarioId) {
    const res = await db.query(
      `SELECT * FROM estados_cuenta 
       WHERE usuario_id = $1 
       ORDER BY id DESC LIMIT 1`,
      [usuarioId]
    );
    return res.rows[0];
  },

  async listarHistorial(usuarioId) {
    const res = await db.query(
      `SELECT * FROM estados_cuenta 
       WHERE usuario_id = $1 
       ORDER BY created_at DESC`,
      [usuarioId]
    );
    return res.rows;
  },

  async listarMorosos() {
    const res = await db.query(`
      SELECT ec.*, u.nombre_completo, u.cedula, u.correo, u.estado as estado_cuenta_usuario,
             (CURRENT_DATE - ec.fecha_limite_pago) as dias_atraso
      FROM estados_cuenta ec
      JOIN usuarios u ON ec.usuario_id = u.id
      WHERE ec.estado IN ('pendiente', 'vencido') AND ec.fecha_limite_pago < CURRENT_DATE
      ORDER BY dias_atraso DESC
    `);
    return res.rows;
  },

  async registrarPagoManual(id) {
    const res = await db.query(
      `UPDATE estados_cuenta 
       SET estado = 'pagado', fecha_pago = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    return res.rows[0];
  },

  async obtenerPorId(id) {
    const res = await db.query(
      `SELECT ec.*, u.nombre_completo, u.cedula, u.correo, u.direccion
       FROM estados_cuenta ec
       JOIN usuarios u ON ec.usuario_id = u.id
       WHERE ec.id = $1`,
      [id]
    );
    return res.rows[0];
  }
};

module.exports = Cobro;
