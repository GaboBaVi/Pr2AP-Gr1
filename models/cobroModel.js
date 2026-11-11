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
  },

  async agregarCargosServicio(usuarioId, monto) {
    if (!monto || monto <= 0) return;
    
    // Buscar si existe un estado de cuenta pendiente para el usuario
    const actual = await this.obtenerEstadoActual(usuarioId);
    if (actual && actual.estado === 'pendiente') {
      await db.query(
        `UPDATE estados_cuenta 
         SET cargos_servicios = cargos_servicios + $1,
             total_pagar = total_pagar + $1
         WHERE id = $2`,
        [monto, actual.id]
      );
    } else {
      // Crear uno nuevo si no existe o ya estaba pagado
      await db.query(
        `INSERT INTO estados_cuenta (usuario_id, periodo, cuota_membresia, cargos_servicios, total_pagar, fecha_limite_pago, estado)
         VALUES ($1, TO_CHAR(CURRENT_DATE, 'TMMonth YYYY'), 35000.00, $2, 35000.00 + $2, CURRENT_DATE + INTERVAL '20 days', 'pendiente')`,
        [usuarioId, monto]
      );
    }
  },

  async descontarCargosServicio(usuarioId, monto) {
    if (!monto || monto <= 0) return;
    const actual = await this.obtenerEstadoActual(usuarioId);
    if (actual && actual.estado === 'pendiente') {
      await db.query(
        `UPDATE estados_cuenta 
         SET cargos_servicios = GREATEST(0, cargos_servicios - $1),
             total_pagar = GREATEST(cuota_membresia, total_pagar - $1)
         WHERE id = $2`,
        [monto, actual.id]
      );
    }
  }
};

module.exports = Cobro;
