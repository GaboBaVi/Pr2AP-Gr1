const Cobro = require('../models/cobroModel');
const Notificacion = require('../models/notificacionModel');
const PDFDocument = require('pdfkit');
const { enviarCorreo } = require('../config/mailer');

const cobrosController = {
  // --- VISTAS SOCIO ---
  async getEstadoCuenta(req, res) {
    try {
      const estadoActual = await Cobro.obtenerEstadoActual(req.session.usuario.id);
      res.render('cobros/estado-cuenta', {
        estadoActual: estadoActual || {
          periodo: 'Periodo Actual',
          total_pagar: 45500.00,
          cuota_membresia: 35000.00,
          cargos_servicios: 10500.00,
          fecha_limite_pago: '2026-10-30',
          estado: 'pendiente'
        }
      });
    } catch (err) {
      console.error(err);
      res.redirect('/socio/dashboard');
    }
  },

  async getPeriodosAnteriores(req, res) {
    try {
      const historial = await Cobro.listarHistorial(req.session.usuario.id);
      res.render('cobros/periodos-anteriores', { historial });
    } catch (err) {
      console.error(err);
      res.redirect('/socio/dashboard');
    }
  },

  async descargarPDF(req, res) {
    const id = req.params.id;
    try {
      const cobro = await Cobro.obtenerPorId(id);
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Estado_Cuenta_${id}.pdf`);

      doc.pipe(res);

      // Encabezado
      doc.fontSize(20).text('CLUB VALLE ALTO', { align: 'center' });
      doc.fontSize(12).text('Resumen de Estado de Cuenta', { align: 'center' });
      doc.moveDown();
      doc.text(`Fecha de emision: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Datos socio
      doc.fontSize(14).text('Informacion del Socio:');
      doc.fontSize(10).text(`Nombre: ${cobro ? cobro.nombre_completo : 'Socio'}`);
      doc.text(`Cedula: ${cobro ? cobro.cedula : 'N/A'}`);
      doc.text(`Correo: ${cobro ? cobro.correo : 'N/A'}`);
      doc.moveDown();

      // Detalle
      doc.fontSize(14).text('Detalle de Cobro:');
      doc.fontSize(10).text(`Periodo: ${cobro ? cobro.periodo : 'Octubre 2026'}`);
      doc.text(`Cuota de Membresia: CRC ${cobro ? cobro.cuota_membresia : '35000.00'}`);
      doc.text(`Cargos Adicionales de Servicios: CRC ${cobro ? cobro.cargos_servicios : '10500.00'}`);
      doc.fontSize(12).text(`Total a Pagar: CRC ${cobro ? cobro.total_pagar : '45500.00'}`, { bold: true });
      doc.moveDown();
      doc.text(`Estado: ${cobro ? cobro.estado.toUpperCase() : 'PENDIENTE'}`);
      doc.text(`Fecha Limite de Pago: ${cobro ? cobro.fecha_limite_pago : '30/10/2026'}`);

      doc.end();
    } catch (err) {
      console.error(err);
      res.redirect('/socio/estado-cuenta');
    }
  },

  // --- VISTAS ADMINISTRATIVAS ---
  async getAdminCobros(req, res) {
    try {
      const morosos = await Cobro.listarMorosos();
      res.render('admin/cobros', {
        morosos,
        mensaje: req.session.mensajeCobros || null
      });
      delete req.session.mensajeCobros;
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard');
    }
  },

  async postRegistrarPago(req, res) {
    const { id } = req.body;
    try {
      await Cobro.registrarPagoManual(id);
      req.session.mensajeCobros = 'Pago registrado y marcado como recibido.';
      res.redirect('/admin/cobros');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/cobros');
    }
  },

  async postEnviarRecordatorios(req, res) {
    try {
      const morosos = await Cobro.listarMorosos();
      const plantilla = await Notificacion.obtenerPlantilla('recordatorio_pago');

      for (const m of morosos) {
        if (plantilla) {
          const cuerpo = plantilla.cuerpo
            .replace('{{nombre}}', m.nombre_completo)
            .replace('{{monto}}', `CRC ${m.total_pagar}`)
            .replace('{{fecha_limite}}', m.fecha_limite_pago);

          await enviarCorreo({
            para: m.correo,
            asunto: plantilla.asunto,
            html: `<p>${cuerpo}</p>`
          });

          await Notificacion.registrarEnBitacora({
            usuario_id: m.usuario_id,
            tipo_notificacion: 'Recordatorio de Pago Pendiente',
            destinatario_correo: m.correo,
            asunto: plantilla.asunto
          });
        }
      }

      req.session.mensajeCobros = `Se enviaron recordatorios a ${morosos.length} socios con pagos pendientes.`;
      res.redirect('/admin/cobros');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/cobros');
    }
  },

  async getAdminNotificaciones(req, res) {
    try {
      const plantillas = await Notificacion.listarPlantillas();
      res.render('admin/notificaciones', {
        plantillas,
        mensaje: req.session.mensajePlantilla || null
      });
      delete req.session.mensajePlantilla;
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard');
    }
  },

  async postActualizarPlantilla(req, res) {
    const { clave, asunto, cuerpo } = req.body;
    try {
      await Notificacion.actualizarPlantilla(clave, asunto, cuerpo);
      req.session.mensajePlantilla = 'Plantilla guardada con exito.';
      res.redirect('/admin/notificaciones');
    } catch (err) {
      console.error(err);
      res.redirect('/admin/notificaciones');
    }
  },

  async getAdminBitacora(req, res) {
    try {
      const logs = await Notificacion.listarBitacora();
      res.render('admin/bitacora', { logs });
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard');
    }
  }
};

module.exports = cobrosController;
