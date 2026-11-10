const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function inicializarBaseDatos() {
  console.log('--- Conectando a Supabase para inicializar tablas ---');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('1. Ejecutando schema.sql...');
    await db.query(schemaSql);
    console.log('✔ Tablas creadas con exito.');

    const seedsSql = fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf8');
    console.log('2. Ejecutando seeds.sql...');
    await db.query(seedsSql);
    console.log('✔ Datos iniciales insertados con exito.');

    // Verificar tablas
    const res = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\nTablas en Supabase:');
    res.rows.forEach(r => console.log(' - ' + r.table_name));

    console.log('\n--- Base de datos lista al 100% en Supabase! ---');
    process.exit(0);
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
    process.exit(1);
  }
}

inicializarBaseDatos();
