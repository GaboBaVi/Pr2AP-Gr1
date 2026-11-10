const db = require('../config/db');

const Usuario = {
  async buscarPorCorreo(correo) {
    const res = await db.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    return res.rows[0];
  },

  async buscarPorId(id) {
    const res = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    return res.rows[0];
  },

  async crearSocio({ cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash }) {
    const res = await db.query(
      `INSERT INTO usuarios (cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash, rol, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'socio', 'activo')
       RETURNING *`,
      [cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash]
    );
    return res.rows[0];
  },

  async actualizarDatos(id, { nombre_completo, telefono, direccion, fecha_nacimiento }) {
    const res = await db.query(
      `UPDATE usuarios 
       SET nombre_completo = $1, telefono = $2, direccion = $3, fecha_nacimiento = $4
       WHERE id = $5
       RETURNING *`,
      [nombre_completo, telefono, direccion, fecha_nacimiento, id]
    );
    return res.rows[0];
  },

  async incrementarIntentos(id) {
    const res = await db.query(
      `UPDATE usuarios 
       SET intentos_fallidos = intentos_fallidos + 1,
           estado = CASE WHEN intentos_fallidos + 1 >= 5 THEN 'suspendido' ELSE estado END
       WHERE id = $1
       RETURNING intentos_fallidos, estado`,
      [id]
    );
    return res.rows[0];
  },

  async resetearIntentos(id) {
    await db.query('UPDATE usuarios SET intentos_fallidos = 0 WHERE id = $1', [id]);
  },

  async guardarTokenRecuperacion(correo, token, expiracion) {
    const res = await db.query(
      `UPDATE usuarios 
       SET token_recuperacion = $1, token_expiracion = $2 
       WHERE correo = $3 
       RETURNING *`,
      [token, expiracion, correo]
    );
    return res.rows[0];
  },

  async buscarPorToken(token) {
    const res = await db.query(
      `SELECT * FROM usuarios 
       WHERE token_recuperacion = $1 AND token_expiracion > NOW()`,
      [token]
    );
    return res.rows[0];
  },

  async actualizarPassword(id, password_hash) {
    const res = await db.query(
      `UPDATE usuarios 
       SET password_hash = $1, token_recuperacion = NULL, token_expiracion = NULL, intentos_fallidos = 0, estado = 'activo'
       WHERE id = $2
       RETURNING *`,
      [password_hash, id]
    );
    return res.rows[0];
  },

  async listarSocios() {
    const res = await db.query(`
      SELECT u.id, u.cedula, u.nombre_completo, u.correo, u.rol, u.estado,
             m.tipo as tipo_membresia, m.estado as estado_membresia
      FROM usuarios u
      LEFT JOIN membresias m ON u.id = m.usuario_id
      ORDER BY u.id DESC
    `);
    return res.rows;
  },

  async cambiarEstado(id, nuevoEstado) {
    const res = await db.query(
      'UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING *',
      [nuevoEstado, id]
    );
    return res.rows[0];
  },

  async cambiarRol(id, nuevoRol) {
    const res = await db.query(
      'UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING *',
      [nuevoRol, id]
    );
    return res.rows[0];
  }
};

module.exports = Usuario;
