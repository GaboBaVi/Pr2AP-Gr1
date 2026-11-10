const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')) 
    ? { rejectUnauthorized: false } 
    : false
});

pool.on('connect', () => {
  console.log('Conectado a la Base de Datos PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de base de datos:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
