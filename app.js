const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuracion de Vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'club_valle_alto_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 dia
  })
);

// Variable global para vistas (usuario en sesion)
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.urlActual = req.path;
  next();
});

// Rutas principales
const authRoutes = require('./routes/authRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cobrosRoutes = require('./routes/cobrosRoutes');

// Pagina de inicio (Main Menu del prototipo)
app.get('/', (req, res) => {
  res.render('index');
});

// Montaje de rutas
app.use('/auth', authRoutes);
app.use('/socio', reservaRoutes);
app.use('/admin', adminRoutes);
app.use('/', cobrosRoutes);

// Manejador de pagina no encontrada (404)
app.use((req, res) => {
  res.status(404).render('error', { mensaje: 'Pagina no encontrada (404).' });
});

// Manejador general de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { mensaje: 'Ocurrio un error en el servidor.' });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Servidor Club Valle Alto corriendo en:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`===============================================`);
});
