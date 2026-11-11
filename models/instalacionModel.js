const db = require('../config/db');

const FRANJAS_HORARIAS = [
  { label: '8:00am - 9:00am', inicio: '08:00:00', fin: '09:00:00' },
  { label: '9:00am - 10:00am', inicio: '09:00:00', fin: '10:00:00' },
  { label: '10:00am - 11:00am', inicio: '10:00:00', fin: '11:00:00' },
  { label: '11:00am - 12:00pm', inicio: '11:00:00', fin: '12:00:00' },
  { label: '12:00pm - 1:00pm', inicio: '12:00:00', fin: '13:00:00' },
  { label: '1:00pm - 2:00pm', inicio: '13:00:00', fin: '14:00:00' },
  { label: '2:00pm - 3:00pm', inicio: '14:00:00', fin: '15:00:00' },
  { label: '3:00pm - 4:00pm', inicio: '15:00:00', fin: '16:00:00' },
  { label: '4:00pm - 5:00pm', inicio: '16:00:00', fin: '17:00:00' },
  { label: '5:00pm - 6:00pm', inicio: '17:00:00', fin: '18:00:00' },
  { label: '7:00pm - 8:00pm', inicio: '19:00:00', fin: '20:00:00' }
];

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

  // Obtener reservas activas afectadas por bloqueo de mantenimiento para cancelarlas
  async cancelarReservasAfectadasPorBloqueo(instalacionId) {
    const res = await db.query(
      `SELECT r.id, r.usuario_id, r.fecha, r.hora_inicio, r.hora_fin, r.costo_servicios,
              u.nombre_completo, u.correo, i.nombre as nombre_instalacion
       FROM reservas r
       JOIN usuarios u ON r.usuario_id = u.id
       JOIN instalaciones i ON r.instalacion_id = i.id
       WHERE r.instalacion_id = $1 AND r.fecha >= CURRENT_DATE AND r.estado = 'activa'`,
      [instalacionId]
    );

    // Cancelar las reservas
    await db.query(
      `UPDATE reservas 
       SET estado = 'cancelada' 
       WHERE instalacion_id = $1 AND fecha >= CURRENT_DATE AND estado = 'activa'`,
      [instalacionId]
    );

    return res.rows;
  },

  // Construir matriz real de ocupación por franja horaria para el calendario admin
  async obtenerMatrizCalendario(fecha) {
    const instalaciones = await this.listarTodas();
    const reservas = await db.query(
      `SELECT r.*, i.aforo_maximo 
       FROM reservas r
       JOIN instalaciones i ON r.instalacion_id = i.id
       WHERE r.fecha = $1 AND r.estado = 'activa'`,
      [fecha]
    );

    const matriz = FRANJAS_HORARIAS.map(franja => {
      const fila = {
        horario: franja.label,
        instalaciones: {}
      };

      instalaciones.forEach(inst => {
        // Buscar reservas activas que se traslapen con esta franja
        const reservasEnFranja = reservas.rows.filter(r => 
          String(r.instalacion_id) === String(inst.id) &&
          r.hora_inicio < franja.fin && r.hora_fin > franja.inicio
        );

        let personas = 0;
        reservasEnFranja.forEach(r => { personas += Number(r.num_personas); });
        const aforo = inst.aforo_maximo || 1;
        const porcentaje = Math.min(100, Math.round((personas / aforo) * 100));

        fila.instalaciones[inst.id] = {
          porcentaje,
          personas,
          bloqueada: inst.bloqueada_mantenimiento
        };
      });

      return fila;
    });

    return { matriz, instalaciones };
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
