# 📋 Plan de Trabajo y Distribución de Tareas por Rol
**Proyecto Web: Sistema de Gestión - Club Valle Alto**  
**Curso:** IC-4810 Administración de Proyectos  
**Profesor:** Dr. Jaime Solano Soto  
**Periodo:** II Semestre, 2026  

---

## 🛠️ Tecnologías y Arquitectura
* **Arquitectura:** Modelo - Vista - Controlador (MVC) estricto.
* **Backend:** Node.js con Express.
* **Vistas (Frontend):** EJS (Motor de plantillas HTML del servidor) + Bootstrap 5 + CSS personalizado.
* **Base de Datos:** PostgreSQL en la nube (Supabase).
* **Servicio de Correos:** Nodemailer (SMTP).
* **Generación de Reportes:** PDFKit.
* **Hosting Gratuito:** Render.com.

---

## ⚡ Guía de Instalación Rápida para el Equipo

Cada integrante debe ejecutar estos pasos en su computadora para tener el proyecto corriendo:

1. **Obtener el código actualizado:**
   ```bash
   git fetch origin
   git checkout dayanna
   git pull origin dayanna
   ```
2. **Instalar paquetes:**
   ```bash
   npm install
   ```
3. **Crear archivo de conexión `.env`:**  
   Crea un archivo llamado `.env` en la raíz del proyecto con este contenido:
   ```env
   PORT=3000
   SESSION_SECRET=super_secret_club_valle_alto_key_2026
   DATABASE_URL=postgresql://postgres:Hercast15141210@db.otfvapfxttnwrnqkuwqc.supabase.co:5432/postgres
   ```
4. **Levantar el servidor:**
   ```bash
   npm run dev
   ```
5. **Abrir en el navegador:** [http://localhost:3000](http://localhost:3000)

> **Cuentas de prueba en la base de datos:**  
> * **Socio:** `vcastro@email.com` | **Contraseña:** `password123`  
> * **Admin General:** `admin@vallealto.cr` | **Contraseña:** `password123`  

---

## 👤 INTEGRANTE 1: Autenticación, Seguridad, Perfil y Membresías (Socio)

### 🎯 Objetivo:
Manejar el ciclo de vida del socio en la plataforma: desde su registro y autenticación segura con bloqueo por fuerza bruta, hasta la gestión de sus datos personales y el registro de beneficiarios en membresías familiares.

### 📌 Requerimientos del Enunciado:
* **Req. 1 (Registro y autenticación de socios):**
  * Formulario de registro (nombre completo, cédula, correo, teléfono, dirección, fecha de nacimiento, contraseña con hash bcrypt).
  * Validación de credenciales al iniciar sesión y **bloqueo automático de acceso tras 5 intentos fallidos**.
  * Recuperación de contraseña mediante token/enlace temporal enviado por correo electrónico.
  * Consulta y edición de datos personales del socio desde su perfil.
* **Req. 2 (Registro de membresías - Vista Socio):**
  * Asociación de cuenta a tipo de membresía (*individual, familiar, corporativa u honoraria*).
  * Formulario modal para **registrar beneficiarios adicionales** en membresías familiares (nombre, cédula, parentesco, fecha de nacimiento) validando el tope máximo permitido por reglamento.

### 🖥️ Pantallas del Prototipo Asignadas:
1. `views/index.ejs` - Landing page pública del club.
2. `views/auth/login.ejs` - Formulario de inicio de sesión con link a recuperación y login admin.
3. `views/auth/register.ejs` - Formulario de creación de cuenta de socio.
4. `views/auth/recovery.ejs` - Pantalla de solicitud de recuperación de contraseña.
5. `views/socio/perfil.ejs` - Perfil del socio: datos personales, tarjeta de membresía y modal de beneficiarios.

### 💻 Archivos de Trabajo:
* `controllers/authController.js`
* `models/usuarioModel.js`
* `models/membresiaModel.js`
* `routes/authRoutes.js`

---

## 👤 INTEGRANTE 2: Reservas de Instalaciones e Invitados (Socio)

### 🎯 Objetivo:
Implementar el motor central de reservas del club, garantizando la disponibilidad horaria sin traslapes, control de aforos y el registro de acompañantes e invitados según las reglas de la membresía.

### 📌 Requerimientos del Enunciado:
* **Req. 3 (Registro de invitados):**
  * Formulario para registrar invitados (nombre completo, cédula, fecha de visita, instalación, parentesco/relación).
  * Validación automática del **límite mensual de invitados** según el tipo de membresía (bloquear registros si se supera el tope).
* **Req. 4 (Reserva de instalaciones):**
  * Formulario de reserva para Cancha de Golf, Cancha de Tenis, Piscina y Salón de Eventos.
  * **Lógica de negocio crítica:**
    * Validar que la instalación seleccionada no esté bloqueada por mantenimiento.
    * Validar horarios de apertura y cierre de la instalación.
    * Impedir **traslapes de horario** con otras reservas confirmadas.
    * Validar que el número de personas no exceda el **aforo máximo** de la instalación.
  * Selección de servicios adicionales (alquiler de equipo de golf/tenis, toallas, mobiliario) y cálculo de su costo.
  * Consulta, modificación y cancelación de reservas antes de la hora de inicio, con historial (*Activas, Finalizadas y Canceladas*).

### 🖥️ Pantallas del Prototipo Asignadas:
1. `views/socio/dashboard.ejs` - Pantalla de bienvenida del socio con botón directo a *"Mis Reservas"*.
2. `views/socio/reservas.ejs` - Mis Reservas: pestañas por estado, contador mensual de invitados y botones de acción.
3. `views/socio/reservar.ejs` - Formulario guiado en 4 pasos (Instalación, Horario/Aforo, Servicios, Invitado).

### 💻 Archivos de Trabajo:
* `controllers/reservaController.js`
* `models/reservaModel.js`
* `models/invitadoModel.js`
* `routes/reservaRoutes.js`

---

## 👤 INTEGRANTE 3: Panel Administrativo (Socios, Roles e Instalaciones)

### 🎯 Objetivo:
Desarrollar la interfaz operativa para el personal del club, controlando el acceso por roles administrativos, la gestión de cuentas de socios y el monitoreo de ocupación de las instalaciones.

### 📌 Requerimientos del Enunciado:
* **Req. 2 y 5 (Gestión de socios, cuentas y administradores):**
  * Control de acceso por roles: *Administrador General*, *Encargado de Instalaciones* y *Encargado de Cobros*.
  * Listado general de socios con buscador en tiempo real.
  * Acciones administrativas: activar, suspender o dar de baja cuentas, cambiar roles y modificar el tipo/estado de membresía con registro de motivo.
* **Req. 6 (Módulo de gestión de instalaciones y calendario):**
  * Calendario general por instalación con monitoreo de ocupación por franjas horarias de 8:00 am a 8:00 pm (Lunes a Domingo).
  * Funcionalidad para **bloquear instalaciones por mantenimiento o eventos privados**, indicando motivo.
  * Generación de reportes de uso de instalaciones por periodo (mayor y menor demanda).
  * Vista de **recepción** para consultar el listado de invitados esperados por día para control de acceso en entrada.

### 🖥️ Pantallas del Prototipo Asignadas:
1. `views/admin/dashboard.ejs` - Panel de control y bienvenida del Administrador.
2. `views/admin/socios.ejs` - Tabla de socios, edición de membresía, gestión de cuentas y cambio de rol.
3. `views/admin/instalaciones.ejs` - Calendario semanal, porcentaje de ocupación y botones de bloqueo.
4. `views/admin/recepcion.ejs` - Vista de recepción para control de acceso de invitados diarios.

### 💻 Archivos de Trabajo:
* `controllers/adminController.js`
* `models/instalacionModel.js`
* `routes/adminRoutes.js`
* `middlewares/auth.js` (Lógica de permisos `permitirRoles`)

---

## 👤 INTEGRANTE 4: Estados de Cuenta, Cobros, PDFs y Centro de Notificaciones

### 🎯 Objetivo:
Administrar las finanzas del socio (cuotas fijas + cargos por servicios de reservas), la generación y descarga de resúmenes contables en PDF y el motor automatizado de correos electrónicos.

### 📌 Requerimientos del Enunciado:
* **Req. 7 (Estado de cuenta y módulo de cobros):**
  * **Lado Socio:** Consulta del periodo actual con desglose de cuota fija, cargos adicionales de reservas, estado (*pagado, pendiente o vencido*) y fecha límite. Historial de periodos anteriores y **descarga del estado de cuenta en formato PDF** (usando `pdfkit`).
  * **Lado Admin:** Módulo de cobros con listado de socios morosos por días de retraso, botón *"Marcar como recibido"* para actualizar el pago manualmente y botón masivo *"Enviar recordatorios de pago"*.
* **Req. 8 (Centro de notificaciones y bitácora):**
  * Envío automático de correos (registro exitoso, confirmación/modificación/cancelación de reserva, nuevo estado de cuenta y recordatorio de pago próximo a vencer).
  * Gestión de **plantillas editables** por el administrador (*Bienvenida, Confirmación, Cancelación, Recordatorio, Cuenta Desactivada*).
  * **Bitácora histórica** consultable con fecha de envío, destinatario, tipo de correo y estado de entrega.
* **Tarea Transversal:** Despliegue de la aplicación web en **hosting gratuito** (Render.com).

### 🖥️ Pantallas del Prototipo Asignadas:
1. `views/cobros/estado-cuenta.ejs` - Vista socio del periodo actual con semáforo de estado y botón descargar PDF.
2. `views/cobros/periodos-anteriores.ejs` - Tabla histórica por mes con descarga de comprobante.
3. `views/admin/cobros.ejs` - Control de cobros: morosos por días de atraso y marcar pagos recibidos.
4. `views/admin/notificaciones.ejs` - Editor de plantillas automáticas por correo.
5. `views/admin/bitacora.ejs` - Bitácora histórica de correos enviados.

### 💻 Archivos de Trabajo:
* `controllers/cobrosController.js`
* `models/cobroModel.js`
* `models/notificacionModel.js`
* `routes/cobrosRoutes.js`
* `config/mailer.js`

---

## 📊 Matriz Resumen de Archivos y Responsabilidades

| Integrante | Rol Principal | Requerimientos | Archivos Clave | Vistas Asignadas |
| :---: | :--- | :---: | :--- | :--- |
| **Persona 1** | Auth, Seguridad y Membresías (Socio) | Req. 1, Req. 2 | `authController.js`<br>`usuarioModel.js`<br>`membresiaModel.js`<br>`authRoutes.js` | `index.ejs`<br>`login.ejs`<br>`register.ejs`<br>`recovery.ejs`<br>`perfil.ejs` |
| **Persona 2** | Reservas, Disponibilidad e Invitados | Req. 3, Req. 4 | `reservaController.js`<br>`reservaModel.js`<br>`invitadoModel.js`<br>`reservaRoutes.js` | `dashboard.ejs`<br>`reservas.ejs`<br>`reservar.ejs` |
| **Persona 3** | Admin: Socios, Roles e Instalaciones | Req. 2, Req. 5, Req. 6 | `adminController.js`<br>`instalacionModel.js`<br>`adminRoutes.js` | `dashboard.ejs`<br>`socios.ejs`<br>`instalaciones.ejs`<br>`recepcion.ejs` |
| **Persona 4** | Finanzas, PDF, Notificaciones y Hosting | Req. 7, Req. 8 | `cobrosController.js`<br>`cobroModel.js`<br>`notificacionModel.js`<br>`cobrosRoutes.js`<br>`mailer.js` | `estado-cuenta.ejs`<br>`periodos-anteriores.ejs`<br>`cobros.ejs`<br>`notificaciones.ejs`<br>`bitacora.ejs` |

---

## 📌 Reglas de Trabajo en Equipo
1. **Trabajo modular sin conflictos:** Cada integrante programa en sus propios controladores, modelos y vistas asignadas.
2. **Seguridad:** El archivo `.env` **nunca se sube a GitHub** (está en `.gitignore`).
3. **Flujo diario de Git:** Antes de empezar a programar en el día, siempre ejecutar `git pull origin dayanna`.
