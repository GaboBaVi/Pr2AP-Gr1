# Club Valle Alto - Plataforma Web de Gestión
**Curso:** IC-4810 Administración de Proyectos  
**Profesor:** Dr. Jaime Solano Soto  
**Periodo:** II Semestre, 2026  

---

## 🚀 Arquitectura y Tecnologías
* **Arquitectura:** Modelo - Vista - Controlador (MVC)
* **Backend:** Node.js con Express
* **Frontend:** EJS (Motor de plantillas HTML del servidor) + Bootstrap 5
* **Base de Datos:** PostgreSQL (Alojado en Supabase)
* **Servicio de Correos:** Nodemailer
* **Generación de Reportes:** PDFKit
* **Hosting Gratuito Sugerido:** Render.com + Supabase

---

## 📂 Estructura del Proyecto (MVC)
```text
Pr2AP-Gr1/
├── config/
│   ├── db.js                   # Conexión a PostgreSQL (Supabase)
│   └── mailer.js               # Servicio de correos Nodemailer
├── controllers/
│   ├── authController.js       # Integrante 1: Auth, recuperación, perfil
│   ├── reservaController.js    # Integrante 2: Reservas e invitados
│   ├── adminController.js      # Integrante 3: Socios, roles y calendario
│   └── cobrosController.js     # Integrante 4: Estados de cuenta, PDF, notificaciones
├── database/
│   ├── schema.sql              # Creación de tablas de la base de datos
│   └── seeds.sql               # Datos iniciales (instalaciones, plantillas)
├── middlewares/
│   └── auth.js                 # Control de acceso por sesión y roles (RBAC)
├── models/
│   ├── usuarioModel.js         # Integrante 1: Socios y administradores
│   ├── membresiaModel.js       # Integrante 1 y 3: Membresías y beneficiarios
│   ├── reservaModel.js         # Integrante 2: Reservas y disponibilidad
│   ├── invitadoModel.js        # Integrante 2: Control de invitados
│   ├── instalacionModel.js     # Integrante 3: Aforos y mantenimiento
│   ├── cobroModel.js           # Integrante 4: Finanzas y morosidad
│   └── notificacionModel.js    # Integrante 4: Plantillas y bitácora
├── public/
│   ├── css/style.css           # Estilos alineados al prototipo Justinmind
│   ├── js/                     # Scripts de validación en cliente
│   └── img/                    # Logos y recursos gráficos del club
├── routes/
│   ├── authRoutes.js           # Integrante 1
│   ├── reservaRoutes.js        # Integrante 2
│   ├── adminRoutes.js          # Integrante 3
│   └── cobrosRoutes.js         # Integrante 4
├── views/
│   ├── layouts/                # Header y Footer compartidos
│   ├── auth/                   # Login, Registro, Recuperar contraseña
│   ├── socio/                  # Dashboard, Mi Perfil, Mis Reservas, Formulario
│   ├── admin/                  # Dashboard Admin, Socios, Calendario Instalaciones
│   └── cobros/                 # Estado de Cuenta, Historial, Cobros, Notificaciones, Bitácora
├── .env.example                # Variables de entorno de ejemplo
├── .gitignore
├── app.js                      # Punto de entrada de la aplicación
└── package.json
```

---

## 👥 División de Tareas para el Grupo de 4 Personas

### 👤 Integrante 1: Autenticación, Seguridad, Usuarios y Membresías (Socio)
* **Requerimientos:** Req. 1 (Registro de socios, login con bloqueo, recuperación de contraseña) y Req. 2 (Membresías del socio y añadir beneficiarios).
* **Archivos asignados:**
  * `controllers/authController.js`
  * `models/usuarioModel.js`, `models/membresiaModel.js`
  * `routes/authRoutes.js`
  * `views/auth/login.ejs`, `views/auth/register.ejs`, `views/auth/recovery.ejs`
  * `views/socio/perfil.ejs`

### 👤 Integrante 2: Reservas de Instalaciones y Registro de Invitados (Socio)
* **Requerimientos:** Req. 3 (Registro de invitados y validación de límite mensual) y Req. 4 (Reserva de instalaciones sin traslapes, aforos, horarios, servicios opcionales, cancelación e historial).
* **Archivos asignados:**
  * `controllers/reservaController.js`
  * `models/reservaModel.js`, `models/invitadoModel.js`
  * `routes/reservaRoutes.js`
  * `views/socio/dashboard.ejs`, `views/socio/reservas.ejs`, `views/socio/reservar.ejs`

### 👤 Integrante 3: Panel Administrativo (Socios, Roles e Instalaciones)
* **Requerimientos:** Req. 2 (Admin: cambiar estado membresía), Req. 5 (Administradores con roles RBAC) y Req. 6 (Módulo de gestión de instalaciones: calendario semanal, ocupación en tiempo real y bloqueo por mantenimiento).
* **Archivos asignados:**
  * `controllers/adminController.js`
  * `models/instalacionModel.js`
  * `routes/adminRoutes.js`
  * `views/admin/dashboard.ejs`, `views/admin/socios.ejs`, `views/admin/instalaciones.ejs`

### 👤 Integrante 4: Estado de Cuenta, Cobros, PDFs y Centro de Notificaciones
* **Requerimientos:** Req. 7 (Estado de cuenta socio con PDF descargable, control de morosos y registro manual de pago) y Req. 8 (Plantillas editables de notificación por correo y bitácora de envíos).
* **Archivos asignados:**
  * `controllers/cobrosController.js`
  * `models/cobroModel.js`, `models/notificacionModel.js`
  * `routes/cobrosRoutes.js`
  * `views/cobros/estado-cuenta.ejs`, `views/cobros/periodos-anteriores.ejs`
  * `views/admin/cobros.ejs`, `views/admin/notificaciones.ejs`, `views/admin/bitacora.ejs`

---

## 🛠️ Instrucciones de Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Configurar variables de entorno:**
   * Copiar `.env.example` como `.env` y colocar la cadena de conexión de Supabase.
3. **Cargar la base de datos en Supabase:**
   * Abrir el *SQL Editor* de Supabase y ejecutar `database/schema.sql`, seguido de `database/seeds.sql`.
4. **Ejecutar el servidor en desarrollo:**
   ```bash
   npm run dev
   ```
5. **Abrir en el navegador:**
   [http://localhost:3000](http://localhost:3000)
