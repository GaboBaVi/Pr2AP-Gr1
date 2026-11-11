-- ============================================================
-- DATOS SEMILLA (SEEDS) INICIALES
-- ============================================================

-- 1. Instalaciones por defecto del Club
INSERT INTO instalaciones (nombre, descripcion, aforo_maximo, hora_apertura, hora_cierre)
VALUES 
    ('Cancha de Golf', 'Campo reglamentario de golf de 18 hoyos', 20, '08:00', '18:00'),
    ('Cancha de Tenis', 'Canchas profesionales de tenis de arcilla', 8, '08:00', '20:00'),
    ('Piscina', 'Piscina olimpica y area recreativa', 30, '08:00', '19:00'),
    ('Salon de Eventos', 'Salon principal para fiestas y reuniones corporativas', 100, '08:00', '23:00')
ON CONFLICT DO NOTHING;

-- 2. Servicios adicionales por instalacion
INSERT INTO servicios_adicionales_disponibles (instalacion_id, nombre, costo)
VALUES
    (1, 'Alquiler de Palos de Golf', 15000.00),
    (1, 'Alquiler de Pelotas de Golf (paquete)', 5000.00),
    (2, 'Alquiler de Raquetas de Tenis', 6000.00),
    (2, 'Alquiler de Pelotas de Tenis', 3000.00),
    (3, 'Alquiler de Accesorios para Piscina', 2500.00),
    (4, 'Montaje de Mobiliario y Sonido', 45000.00)
ON CONFLICT DO NOTHING;

-- 3. Plantillas de notificacion iniciales
INSERT INTO plantillas_notificacion (clave, nombre, asunto, cuerpo)
VALUES
    ('bienvenida', 'Plantilla Bienvenida', 'Bienvenido a Club Valle Alto', 'Hola {{nombre}}, te damos la mas cordial bienvenida como socio de Club Valle Alto. Tu cuenta esta lista.'),
    ('reserva_confirmada', 'Plantilla Confirmacion de Reserva', 'Confirmacion de tu Reserva en Club Valle Alto', 'Estimado(a) {{nombre}}, tu reserva para la instalacion {{instalacion}} el dia {{fecha}} de {{hora_inicio}} a {{hora_fin}} ha sido confirmada con exito.'),
    ('reserva_cancelada', 'Plantilla Cancelacion de Reserva', 'Cancelacion de Reserva', 'Estimado(a) {{nombre}}, tu reserva para la fecha {{fecha}} ha sido cancelada.'),
    ('estado_cuenta', 'Plantilla Nuevo Estado de Cuenta', 'Nuevo Estado de Cuenta Disponible', 'Estimado(a) {{nombre}}, se ha generado tu estado de cuenta para el periodo {{periodo}} con un saldo de {{monto}}. Fecha limite: {{fecha_limite}}.'),
    ('recordatorio_pago', 'Plantilla Recordatorio de Pago', 'Aviso de Pago Pendiente - Club Valle Alto', 'Estimado(a) {{nombre}}, te recordamos que tienes un pago pendiente por monto de {{monto}} que vence el {{fecha_limite}}.'),
    ('cuenta_desactivada', 'Plantilla Cuenta Desactivada', 'Notificacion sobre el estado de tu cuenta', 'Estimado(a) {{nombre}}, te informamos que tu cuenta ha cambiado de estado en el Club Valle Alto. Para mas detalles contacta a administracion.'),
    ('mantenimiento_cancelacion', 'Plantilla Cancelación por Mantenimiento', 'Aviso Importante: Cancelación de Reserva por Mantenimiento - Club Valle Alto', 'Estimado(a) {{nombre}}, le informamos que debido a mantenimiento o evento privado en la instalación {{instalacion}}, su reserva para el día {{fecha}} ha sido cancelada. Cualquier cargo adicional asociado fue anulado de su estado de cuenta.'),
    ('mantenimiento_restablecido', 'Plantilla Instalación Restablecida', 'Instalación Disponible Nuevamente - Club Valle Alto', 'Estimado(a) {{nombre}}, le informamos que la instalación {{instalacion}} ha finalizado su mantenimiento y ya está disponible para reservas.')
ON CONFLICT (clave) DO NOTHING;

-- 4. Usuarios de prueba (Password para ambos: password123)
-- Admin General
INSERT INTO usuarios (cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash, rol, estado)
VALUES ('1-0000-0001', 'Administrador General', 'admin@vallealto.cr', '8888-8888', 'Club Valle Alto', '1990-01-01', '$2a$10$1R2lES8XM9QYjMajL2Q0t.KFGXzvjOPW8N5.3dMyocIvV9979f0/e', 'admin_general', 'activo')
ON CONFLICT (correo) DO NOTHING;

-- Socio del Prototipo: Valeria Castro Jimenez
INSERT INTO usuarios (cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash, rol, estado)
VALUES ('3-0712-0934', 'Valeria Castro Jiménez', 'vcastro@email.com', '8712-9034', 'Cartago, Dulce Nombre, Residencial Valle Alto #42', '1998-05-14', '$2a$10$1R2lES8XM9QYjMajL2Q0t.KFGXzvjOPW8N5.3dMyocIvV9979f0/e', 'socio', 'activo')
ON CONFLICT (correo) DO NOTHING;

-- Membresia de Valeria
INSERT INTO membresias (usuario_id, tipo, fecha_inscripcion, fecha_renovacion, monto_cuota, estado, limite_invitados_mes, limite_beneficiarios)
SELECT id, 'familiar', '2026-07-06', '2027-07-06', 35000.00, 'activa', 5, 4
FROM usuarios WHERE correo = 'vcastro@email.com'
ON CONFLICT DO NOTHING;

-- Estado de Cuenta de Valeria (coincidente con el prototipo)
INSERT INTO estados_cuenta (usuario_id, periodo, cuota_membresia, cargos_servicios, total_pagar, fecha_limite_pago, estado)
SELECT id, 'Octubre 2026', 35000.00, 10500.00, 45500.00, '2026-10-30', 'pendiente'
FROM usuarios WHERE correo = 'vcastro@email.com'
ON CONFLICT DO NOTHING;
