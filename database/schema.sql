-- ============================================================
-- BASE DE DATOS: CLUB VALLE ALTO
-- Arquitectura Relacional para PostgreSQL (Compatible con Supabase)
-- ============================================================

-- 1. TABLA: USUARIOS (Socios y Administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    correo VARCHAR(120) UNIQUE NOT NULL,
    telefono VARCHAR(25),
    direccion TEXT,
    fecha_nacimiento DATE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(40) NOT NULL DEFAULT 'socio', -- 'socio', 'admin_general', 'encargado_instalaciones', 'encargado_cobros'
    estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- 'activo', 'suspendido', 'inactivo'
    intentos_fallidos INT DEFAULT 0,
    token_recuperacion VARCHAR(255),
    token_expiracion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: MEMBRESIAS
CREATE TABLE IF NOT EXISTS membresias (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL DEFAULT 'individual', -- 'individual', 'familiar', 'corporativa', 'honoraria'
    fecha_inscripcion DATE DEFAULT CURRENT_DATE,
    fecha_renovacion DATE,
    monto_cuota DECIMAL(10,2) NOT NULL DEFAULT 35000.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'activa', -- 'activa', 'suspendida', 'vencida'
    limite_invitados_mes INT DEFAULT 5,
    limite_beneficiarios INT DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: HISTORIAL DE CAMBIOS DE ESTADO DE MEMBRESIA
CREATE TABLE IF NOT EXISTS historial_membresias (
    id SERIAL PRIMARY KEY,
    membresia_id INT REFERENCES membresias(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20),
    motivo TEXT,
    usuario_admin_id INT REFERENCES usuarios(id),
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: BENEFICIARIOS ADICIONALES (Membresia Familiar)
CREATE TABLE IF NOT EXISTS beneficiarios (
    id SERIAL PRIMARY KEY,
    membresia_id INT REFERENCES membresias(id) ON DELETE CASCADE,
    cedula VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA: INSTALACIONES
CREATE TABLE IF NOT EXISTS instalaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL, -- 'Cancha de Golf', 'Cancha de Tenis', 'Piscina', 'Salon de Eventos'
    descripcion TEXT,
    aforo_maximo INT NOT NULL,
    hora_apertura TIME NOT NULL DEFAULT '08:00',
    hora_cierre TIME NOT NULL DEFAULT '20:00',
    bloqueada_mantenimiento BOOLEAN DEFAULT FALSE,
    motivo_bloqueo TEXT,
    mantenimiento_tipo VARCHAR(20) DEFAULT 'todo_el_dia',
    mantenimiento_hora_inicio TIME,
    mantenimiento_hora_fin TIME,
    mantenimiento_fecha DATE
);

-- 6. TABLA: SERVICIOS ADICIONALES POR INSTALACION
CREATE TABLE IF NOT EXISTS servicios_adicionales_disponibles (
    id SERIAL PRIMARY KEY,
    instalacion_id INT REFERENCES instalaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 7. TABLA: RESERVAS
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    instalacion_id INT REFERENCES instalaciones(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    num_personas INT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activa', -- 'activa', 'finalizada', 'cancelada'
    costo_servicios DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: SERVICIOS ASOCIADOS A LA RESERVA
CREATE TABLE IF NOT EXISTS reserva_servicios_seleccionados (
    id SERIAL PRIMARY KEY,
    reserva_id INT REFERENCES reservas(id) ON DELETE CASCADE,
    servicio_id INT REFERENCES servicios_adicionales_disponibles(id),
    nombre_servicio VARCHAR(100),
    costo DECIMAL(10,2) NOT NULL
);

-- 9. TABLA: REGISTRO DE INVITADOS
CREATE TABLE IF NOT EXISTS invitados (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    instalacion_id INT REFERENCES instalaciones(id) ON DELETE SET NULL,
    reserva_id INT REFERENCES reservas(id) ON DELETE SET NULL,
    cedula VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    fecha_visita DATE NOT NULL,
    parentesco_relacion VARCHAR(50) NOT NULL, -- 'familiar', 'amigo', 'otro'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA: ESTADOS DE CUENTA
CREATE TABLE IF NOT EXISTS estados_cuenta (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    periodo VARCHAR(50) NOT NULL, -- ej. 'Octubre 2026'
    cuota_membresia DECIMAL(10,2) NOT NULL DEFAULT 35000.00,
    cargos_servicios DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_pagar DECIMAL(10,2) NOT NULL,
    fecha_limite_pago DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'pagado', 'vencido'
    fecha_pago TIMESTAMP,
    dias_retraso INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA: PLANTILLAS DE NOTIFICACION EDITABLES (ADMIN)
CREATE TABLE IF NOT EXISTS plantillas_notificacion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(50) UNIQUE NOT NULL, -- 'bienvenida', 'reserva_confirmada', 'reserva_cancelada', 'estado_cuenta', 'recordatorio_pago', 'cuenta_desactivada'
    nombre VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    cuerpo TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABLA: BITACORA HISTORICA DE NOTIFICACIONES
CREATE TABLE IF NOT EXISTS bitacora_notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_notificacion VARCHAR(50) NOT NULL,
    destinatario_correo VARCHAR(120) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    estado_entrega VARCHAR(20) DEFAULT 'Entregado', -- 'Entregado', 'Visto', 'Pendiente', 'Error'
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
