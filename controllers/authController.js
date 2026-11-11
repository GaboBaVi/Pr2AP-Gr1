const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarioModel');
const Membresia = require('../models/membresiaModel');
const crypto = require('crypto');
const { enviarCorreo } = require('../config/mailer');

const authController = {
  getLogin(req, res) {
    res.render('auth/login', { 
      error: req.session.mensajeError || null, 
      exito: req.session.mensajeExito || null 
    });
    delete req.session.mensajeError;
    delete req.session.mensajeExito;
  },

  async postLogin(req, res) {
    const { correo, password } = req.body;
    try {
      const usuario = await Usuario.buscarPorCorreo(correo);
      if (!usuario) {
        req.session.mensajeError = 'Credenciales inválidas.';
        return res.redirect('/auth/login');
      }

      if (usuario.estado === 'suspendido' || usuario.estado === 'inactivo') {
        req.session.mensajeError = 'Tu cuenta está bloqueada o inactiva. Contacta a la administración.';
        return res.redirect('/auth/login');
      }

      const match = await bcrypt.compare(password, usuario.password_hash);
      if (!match) {
        const estadoActualizado = await Usuario.incrementarIntentos(usuario.id);
        if (estadoActualizado.intentos_fallidos >= 5) {
          req.session.mensajeError = 'Tu cuenta ha sido bloqueada tras 5 intentos fallidos consecutivos.';
        } else {
          req.session.mensajeError = `Contraseña incorrecta. Intentos restantes antes del bloqueo: ${5 - estadoActualizado.intentos_fallidos}`;
        }
        return res.redirect('/auth/login');
      }

      // Login exitoso: restablecer intentos
      await Usuario.resetearIntentos(usuario.id);

      req.session.usuario = {
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol
      };

      if (['admin_general', 'encargado_instalaciones', 'encargado_cobros'].includes(usuario.rol)) {
        return res.redirect('/admin/dashboard');
      }
      return res.redirect('/socio/dashboard');
    } catch (err) {
      console.error('Error en postLogin:', err);
      req.session.mensajeError = 'Error al procesar el inicio de sesión.';
      res.redirect('/auth/login');
    }
  },

  getRegister(req, res) {
    res.render('auth/register', { error: null });
  },

  async postRegister(req, res) {
    const { nombre_completo, cedula, correo, telefono, direccion, fecha_nacimiento, password } = req.body;
    try {
      // Validar formato de cédula costarricense
      const regexCedula = /^(?:[1-9]-?\d{4}-?\d{4}|\d{9}|\d{11,12})$/;
      if (!regexCedula.test(cedula.trim())) {
        return res.render('auth/register', { error: 'El formato de cédula ingresado no es válido (ej. 1-1234-0567 o 9 dígitos).' });
      }

      // Validar formato de teléfono costarricense
      const regexTelefono = /^(?:\+?506[- ]?)?[2-8]\d{3}[- ]?\d{4}$/;
      if (!regexTelefono.test(telefono.trim())) {
        return res.render('auth/register', { error: 'El formato de teléfono debe ser de 8 dígitos costarricense (ej. 8888-8888).' });
      }

      const existe = await Usuario.buscarPorCorreo(correo);
      if (existe) {
        return res.render('auth/register', { error: 'El correo electrónico ya se encuentra registrado.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const nuevoUsuario = await Usuario.crearSocio({
        cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash: hash
      });

      // Crear membresía individual activa por defecto
      await Membresia.crear({ usuario_id: nuevoUsuario.id, tipo: 'individual' });

      // Enviar correo de bienvenida
      await enviarCorreo({
        para: correo,
        asunto: '¡Bienvenido(a) a Club Valle Alto!',
        html: `<h3>Hola ${nombre_completo},</h3><p>Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión y comenzar a reservar instalaciones.</p>`
      });

      req.session.mensajeExito = 'Registro exitoso. Ya puedes iniciar sesión con tus credenciales.';
      res.redirect('/auth/login');
    } catch (err) {
      console.error('Error en postRegister:', err);
      res.render('auth/register', { error: 'Error al registrar la cuenta. Verifica que la cédula o correo no estén repetidos.' });
    }
  },

  getRecovery(req, res) {
    res.render('auth/recovery', { mensaje: null, error: null });
  },

  async postRecovery(req, res) {
    const { correo } = req.body;
    try {
      const usuario = await Usuario.buscarPorCorreo(correo);
      if (!usuario) {
        return res.render('auth/recovery', { 
          mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos.', 
          error: null 
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiracion = new Date(Date.now() + 3600000); // 1 hora de validez
      await Usuario.guardarTokenRecuperacion(correo, token, expiracion);

      const resetUrl = `http://${req.headers.host}/auth/reset/${token}`;

      await enviarCorreo({
        para: correo,
        asunto: 'Recuperación de Contraseña - Club Valle Alto',
        html: `
          <h3>Hola ${usuario.nombre_completo},</h3>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para definir una nueva:</p>
          <p><a href="${resetUrl}" style="background-color: #3ea647; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a></p>
          <p><small>Este enlace expirará en 1 hora. Si no realizaste esta solicitud, ignora este mensaje.</small></p>
        `
      });

      res.render('auth/recovery', { 
        mensaje: 'Se ha enviado un enlace de recuperación a tu correo electrónico.', 
        error: null 
      });
    } catch (err) {
      console.error('Error en postRecovery:', err);
      res.render('auth/recovery', { mensaje: null, error: 'Ocurrió un error al procesar la solicitud.' });
    }
  },

  // Vista para ingresar nueva contraseña con el token
  async getResetPassword(req, res) {
    const { token } = req.params;
    try {
      const usuario = await Usuario.buscarPorToken(token);
      if (!usuario) {
        req.session.mensajeError = 'El enlace de recuperación es inválido o ha expirado.';
        return res.redirect('/auth/login');
      }
      res.render('auth/reset-password', { token, error: null });
    } catch (err) {
      console.error('Error en getResetPassword:', err);
      res.redirect('/auth/login');
    }
  },

  // Procesar cambio de contraseña con el token
  async postResetPassword(req, res) {
    const { token } = req.params;
    const { password, confirm_password } = req.body;

    if (!password || password.length < 6) {
      return res.render('auth/reset-password', { token, error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    if (password !== confirm_password) {
      return res.render('auth/reset-password', { token, error: 'Las contraseñas no coinciden.' });
    }

    try {
      const usuario = await Usuario.buscarPorToken(token);
      if (!usuario) {
        req.session.mensajeError = 'El enlace de recuperación ha expirado o ya fue utilizado.';
        return res.redirect('/auth/login');
      }

      const hash = await bcrypt.hash(password, 10);
      await Usuario.actualizarPassword(usuario.id, hash);

      req.session.mensajeExito = 'Tu contraseña ha sido restablecida exitosamente. Inicia sesión con tu nueva contraseña.';
      res.redirect('/auth/login');
    } catch (err) {
      console.error('Error en postResetPassword:', err);
      res.render('auth/reset-password', { token, error: 'Error al actualizar la contraseña.' });
    }
  },

  async getPerfil(req, res) {
    try {
      const usuario = await Usuario.buscarPorId(req.session.usuario.id);
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      const beneficiarios = membresia ? await Membresia.obtenerBeneficiarios(membresia.id) : [];

      res.render('socio/perfil', {
        usuario,
        membresia: membresia || {},
        beneficiarios,
        mensaje: req.session.mensajePerfil || null
      });
      delete req.session.mensajePerfil;
    } catch (err) {
      console.error('Error en getPerfil:', err);
      res.redirect('/socio/dashboard');
    }
  },

  async postEditarPerfil(req, res) {
    try {
      const { nombre_completo, telefono, direccion, fecha_nacimiento } = req.body;
      await Usuario.actualizarDatos(req.session.usuario.id, {
        nombre_completo, telefono, direccion, fecha_nacimiento
      });
      req.session.usuario.nombre = nombre_completo;
      req.session.mensajePerfil = 'Datos actualizados con éxito.';
      res.redirect('/auth/perfil');
    } catch (err) {
      console.error('Error en postEditarPerfil:', err);
      res.redirect('/auth/perfil');
    }
  },

  async postAgregarBeneficiario(req, res) {
    try {
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      if (!membresia || membresia.tipo !== 'familiar') {
        req.session.mensajePerfil = 'Solo las membresías de tipo Familiar permiten registrar beneficiarios adicionales.';
        return res.redirect('/auth/perfil');
      }

      const total = await Membresia.contarBeneficiarios(membresia.id);
      if (total >= membresia.limite_beneficiarios) {
        req.session.mensajePerfil = `Has alcanzado el límite máximo de ${membresia.limite_beneficiarios} beneficiarios permitidos por reglamento.`;
        return res.redirect('/auth/perfil');
      }

      const { cedula, nombre_completo, parentesco, fecha_nacimiento } = req.body;
      await Membresia.agregarBeneficiario({
        membresia_id: membresia.id,
        cedula, nombre_completo, parentesco, fecha_nacimiento
      });

      req.session.mensajePerfil = 'Beneficiario registrado exitosamente.';
      res.redirect('/auth/perfil');
    } catch (err) {
      console.error('Error en postAgregarBeneficiario:', err);
      res.redirect('/auth/perfil');
    }
  },

  async postEditarBeneficiario(req, res) {
    try {
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      if (!membresia) {
        return res.redirect('/auth/perfil');
      }

      const { id, cedula, nombre_completo, parentesco, fecha_nacimiento } = req.body;
      const actualizado = await Membresia.actualizarBeneficiario(id, membresia.id, {
        cedula: cedula.trim(),
        nombre_completo: nombre_completo.trim(),
        parentesco,
        fecha_nacimiento
      });

      if (actualizado) {
        req.session.mensajePerfil = 'Información del beneficiario actualizada con éxito.';
      } else {
        req.session.mensajePerfil = 'No se encontró el beneficiario para actualizar.';
      }
      res.redirect('/auth/perfil');
    } catch (err) {
      console.error('Error en postEditarBeneficiario:', err);
      req.session.mensajePerfil = 'Error interno al actualizar el beneficiario.';
      res.redirect('/auth/perfil');
    }
  },

  async postEliminarBeneficiario(req, res) {
    try {
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      if (!membresia) {
        return res.redirect('/auth/perfil');
      }

      const { id } = req.body;
      const eliminado = await Membresia.eliminarBeneficiario(id, membresia.id);

      if (eliminado) {
        req.session.mensajePerfil = 'Beneficiario retirado de la membresía con éxito.';
      } else {
        req.session.mensajePerfil = 'No se pudo retirar el beneficiario.';
      }
      res.redirect('/auth/perfil');
    } catch (err) {
      console.error('Error en postEliminarBeneficiario:', err);
      req.session.mensajePerfil = 'Error interno al eliminar el beneficiario.';
      res.redirect('/auth/perfil');
    }
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
};

module.exports = authController;
