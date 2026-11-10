const db = require('../config/db');

const Notificacion = {
  async listarPlantillas() {
    const res = await db.query('SELECT * FROM plantillas_notificacion ORDER BY id ASC');
    return res.rows;
  },

  async obtenerPlantilla(clave) {
    const res = await db.query('SELECT * FROM plantillas_notificacion WHERE clave = $1', [clave]);
    return res.rows[0];
  },

  async actualizarPlantilla(clave, asunto, cuerpo) {
    const res = await db.query(
      `UPDATE plantillas_notificacion 
       SET asunto = $1, cuerpo = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE clave = $3 
       RETURNING *`,
      [asunto, cuerpo, clave]
    );
    return res.rows[0];
  },

  async registrarEnBitacora({ usuario_id, tipo_notificacion, destinatario_correo, asunto, estado_entrega }) {
    const res = await db.query(
      `INSERT INTO bitacora_notificaciones (usuario_id, tipo_notificacion, destinatario_correo, asunto, estado_entrega)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [usuario_id, tipo_notificacion, destinatario_correo, asunto, estado_entrega || 'Entregado']
    );
    return res.rows[0];
  },

  async listarBitacora() {
    const res = await db.query(`
      SELECT b.*, u.nombre_completo as nombre_socio
      FROM bitacora_notificaciones b
      LEFT JOIN usuarios u ON b.usuario_id = u.id
      ORDER BY b.fecha_envio DESC
    `);
    return res.rows;
  }
};

module.exports = Notificacion;
