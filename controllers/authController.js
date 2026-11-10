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
        req.session.mensajeError = 'Credenciales invalidas.';
        return res.redirect('/auth/login');
      }

      if (usuario.estado === 'suspendido' || usuario.estado === 'inactivo') {
        req.session.mensajeError = 'Tu cuenta esta bloqueada o inactiva. Contacta al administrador.';
        return res.redirect('/auth/login');
      }

      const match = await bcrypt.compare(password, usuario.password_hash);
      if (!match) {
        const estadoActualizado = await Usuario.incrementarIntentos(usuario.id);
        if (estadoActualizado.intentos_fallidos >= 5) {
          req.session.mensajeError = 'Cuenta bloqueada por multiples intentos fallidos.';
        } else {
          req.session.mensajeError = `Contraseña incorrecta. Intentos restantes: ${5 - estadoActualizado.intentos_fallidos}`;
        }
        return res.redirect('/auth/login');
      }

      // Login exitoso: resetear intentos
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
      console.error(err);
      req.session.mensajeError = 'Error al procesar el inicio de sesion.';
      res.redirect('/auth/login');
    }
  },

  getRegister(req, res) {
    res.render('auth/register', { error: null });
  },

  async postRegister(req, res) {
    const { nombre_completo, cedula, correo, telefono, direccion, fecha_nacimiento, password } = req.body;
    try {
      const existe = await Usuario.buscarPorCorreo(correo);
      if (existe) {
        return res.render('auth/register', { error: 'El correo electronico ya esta registrado.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const nuevoUsuario = await Usuario.crearSocio({
        cedula, nombre_completo, correo, telefono, direccion, fecha_nacimiento, password_hash: hash
      });

      // Crear membresia individual por defecto
      await Membresia.crear({ usuario_id: nuevoUsuario.id, tipo: 'individual' });

      req.session.mensajeExito = 'Registro exitoso. Por favor inicia sesion.';
      res.redirect('/auth/login');
    } catch (err) {
      console.error(err);
      res.render('auth/register', { error: 'Error al registrar la cuenta. Verifica que la cedula o correo no existan.' });
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
        return res.render('auth/recovery', { mensaje: 'Si el correo esta registrado, recibiras un enlace.', error: null });
      }

      const token = crypto.randomBytes(20).toString('hex');
      const expiracion = new Date(Date.now() + 3600000); // 1 hora
      await Usuario.guardarTokenRecuperacion(correo, token, expiracion);

      // Enviar correo
      await enviarCorreo({
        para: correo,
        asunto: 'Recuperacion de Contraseña - Club Valle Alto',
        html: `<p>Hola ${usuario.nombre_completo},</p><p>Para restablecer tu contraseña haz clic en el siguiente enlace:</p><a href="http://${req.headers.host}/auth/reset/${token}">Restablecer contraseña</a>`
      });

      res.render('auth/recovery', { mensaje: 'Se ha enviado un enlace de recuperacion a tu correo electronico.', error: null });
    } catch (err) {
      console.error(err);
      res.render('auth/recovery', { mensaje: null, error: 'Ocurrio un error al procesar la solicitud.' });
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
      console.error(err);
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
      req.session.mensajePerfil = 'Datos actualizados con exito.';
      res.redirect('/socio/perfil');
    } catch (err) {
      console.error(err);
      res.redirect('/socio/perfil');
    }
  },

  async postAgregarBeneficiario(req, res) {
    try {
      const membresia = await Membresia.obtenerPorUsuario(req.session.usuario.id);
      if (!membresia || membresia.tipo !== 'familiar') {
        req.session.mensajePerfil = 'Solo las membresias familiares pueden registrar beneficiarios.';
        return res.redirect('/socio/perfil');
      }

      const total = await Membresia.contarBeneficiarios(membresia.id);
      if (total >= membresia.limite_beneficiarios) {
        req.session.mensajePerfil = `Has alcanzado el limite maximo de ${membresia.limite_beneficiarios} beneficiarios.`;
        return res.redirect('/socio/perfil');
      }

      const { cedula, nombre_completo, parentesco, fecha_nacimiento } = req.body;
      await Membresia.agregarBeneficiario({
        membresia_id: membresia.id,
        cedula, nombre_completo, parentesco, fecha_nacimiento
      });

      req.session.mensajePerfil = 'Beneficiario registrado exitosamente.';
      res.redirect('/socio/perfil');
    } catch (err) {
      console.error(err);
      res.redirect('/socio/perfil');
    }
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
};

module.exports = authController;
