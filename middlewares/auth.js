function estaAutenticado(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  req.session.mensajeError = 'Debes iniciar sesion para acceder.';
  res.redirect('/auth/login');
}

function esSocio(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'socio') {
    return next();
  }
  res.status(403).render('error', { mensaje: 'Acceso no autorizado para este perfil.' });
}

function esAdmin(req, res, next) {
  if (
    req.session && 
    req.session.usuario && 
    ['admin_general', 'encargado_instalaciones', 'encargado_cobros'].includes(req.session.usuario.rol)
  ) {
    return next();
  }
  res.status(403).render('error', { mensaje: 'Requiere permisos de administrador.' });
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (req.session && req.session.usuario && rolesPermitidos.includes(req.session.usuario.rol)) {
      return next();
    }
    res.status(403).render('error', { mensaje: 'No tienes los permisos requeridos para esta accion.' });
  };
}

module.exports = {
  estaAutenticado,
  esSocio,
  esAdmin,
  permitirRoles
};
