const Cobro = require('../models/cobroModel');
const Notificacion = require('../models/notificacionModel');
const Usuario = require('../models/usuarioModel');
const PDFDocument = require('pdfkit');
const { enviarCorreo } = require('../config/mailer');

const cobrosController = {
  // --- VISTAS SOCIO ---
  async getEstadoCuenta(req, res) {
    try {
      let estadoActual = await Cobro.obtenerEstadoActual(req.session.usuario.id);
      
      // Si el socio no tiene ningún estado de cuenta registrado, inicializamos uno pendiente por defecto
      if (!estadoActual) {
        await Cobro.agregarCargosServicio(req.session.usuario.id, 0);
        estadoActual = await Cobro.obtenerEstadoActual(req.session.usuario.id);
      }

      res.render('cobros/estado-cuenta', {
        estadoActual: estadoActual || {
          id: 1,
          periodo: 'Periodo Actual',
          total_pagar: 35000.00,
          cuota_membresia: 35000.00,
          cargos_servicios: 0.00,
          fecha_limite_pago: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
          estado: 'pendiente'
        }
      });
    } catch (err) {
      console.error('Error en getEstadoCuenta:', err);
      res.redirect('/socio/dashboard');
    }
  },

  async getPeriodosAnteriores(req, res) {
    try {
      const historial = await Cobro.listarHistorial(req.session.usuario.id);
      res.render('cobros/periodos-anteriores', { historial });
    } catch (err) {
      console.error('Error en getPeriodosAnteriores:', err);
      res.redirect('/socio/dashboard');
    }
  },

  async descargarPDF(req, res) {
    const id = req.params.id;
    try {
      const cobro = await Cobro.obtenerPorId(id);
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Estado_Cuenta_ValleAlto_${id}.pdf`);

      doc.pipe(res);

      // 1. Encabezado institucional
      doc.rect(50, 45, 495, 60).fill('#2e7d32');
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('CLUB VALLE ALTO', 65, 58);
      doc.fontSize(11).font('Helvetica').text('ESTADO DE CUENTA MENSUAL', 65, 84);

      doc.fillColor('#333333');
      doc.moveDown(3);

      // 2. Información del Socio y Documento
      const yInfo = 125;
      doc.fontSize(10).font('Helvetica-Bold').text('INFORMACIÓN DEL SOCIO:', 50, yInfo);
      doc.font('Helvetica').text(`Nombre: ${cobro ? cobro.nombre_completo : req.session.usuario.nombre}`, 50, yInfo + 15);
      doc.text(`Cédula: ${cobro ? cobro.cedula : req.session.usuario.cedula}`, 50, yInfo + 28);
      doc.text(`Correo: ${cobro ? cobro.correo : req.session.usuario.correo}`, 50, yInfo + 41);

      doc.font('Helvetica-Bold').text('DETALLES DEL COBRO:', 340, yInfo);
      doc.font('Helvetica').text(`Periodo: ${cobro ? cobro.periodo : 'Mes en Curso'}`, 340, yInfo + 15);
      doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 340, yInfo + 28);
      doc.text(`Fecha Límite: ${cobro ? new Date(cobro.fecha_limite_pago).toLocaleDateString() : 'N/A'}`, 340, yInfo + 41);

      // Línea divisoria
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, 195).lineTo(545, 195).stroke();

      // 3. Tabla de rubros
      const yTable = 215;
      doc.rect(50, yTable, 495, 24).fill('#f2f2f2');
      doc.fillColor('#222222').font('Helvetica-Bold').fontSize(10);
      doc.text('Concepto / Rubro', 65, yTable + 7);
      doc.text('Monto (CRC)', 430, yTable + 7, { align: 'right', width: 100 });

      // Fila 1: Cuota membresía
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text('Cuota de Membresía del Periodo', 65, yTable + 35);
      doc.text(`CRC ${Number(cobro ? cobro.cuota_membresia : 35000).toLocaleString()}`, 430, yTable + 35, { align: 'right', width: 100 });

      // Fila 2: Servicios adicionales
      doc.text('Cargos Adicionales por Servicios de Instalaciones', 65, yTable + 55);
      doc.text(`CRC ${Number(cobro ? cobro.cargos_servicios : 0).toLocaleString()}`, 430, yTable + 55, { align: 'right', width: 100 });

      doc.strokeColor('#dddddd').lineWidth(1).moveTo(50, yTable + 80).lineTo(545, yTable + 80).stroke();

      // Total
      const total = cobro ? Number(cobro.total_pagar) : 35000;
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#222222');
      doc.text('TOTAL A PAGAR:', 280, yTable + 95);
      doc.text(`CRC ${total.toLocaleString()}`, 430, yTable + 95, { align: 'right', width: 100 });

      // 4. Estado de Pago
      const estado = cobro ? cobro.estado.toUpperCase() : 'PENDIENTE';
      const colorEstado = estado === 'PAGADO' ? '#2e7d32' : (estado === 'PENDIENTE' ? '#e65100' : '#c62828');

      doc.rect(50, yTable + 130, 495, 40).fillAndStroke('#fafafa', '#cccccc');
      doc.fillColor(colorEstado).font('Helvetica-Bold').fontSize(12);
      doc.text(`ESTADO: ${estado}`, 65, yTable + 144);
      if (estado === 'PAGADO' && cobro?.fecha_pago) {
        doc.font('Helvetica').fontSize(10).fillColor('#555555').text(`Registrado el: ${new Date(cobro.fecha_pago).toLocaleString()}`, 250, yTable + 145);
      }

      // 5. Pie de página
      doc.fillColor('#888888').fontSize(9).font('Helvetica');
      doc.text('Club Valle Alto • Cartago, Costa Rica • Tel: +506 2550-0000 • administracion@vallealto.cr', 50, 750, { align: 'center', width: 495 });

      doc.end();
    } catch (err) {
      console.error('Error generando PDF:', err);
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
      console.error('Error en getAdminCobros:', err);
      res.redirect('/admin/dashboard');
    }
  },

  async postRegistrarPago(req, res) {
    const { id } = req.body;
    try {
      const pagado = await Cobro.registrarPagoManual(id);
      
      // Notificar al socio sobre el pago registrado
      if (pagado) {
        const detalle = await Cobro.obtenerPorId(id);
        if (detalle && detalle.correo) {
          await enviarCorreo({
            para: detalle.correo,
            asunto: 'Comprobante de Pago Recibido - Club Valle Alto',
            html: `
              <h3>Estimado(a) ${detalle.nombre_completo},</h3>
              <p>Hemos registrado correctamente el pago de tu cuota para el periodo <strong>${detalle.periodo}</strong> por un monto de <strong>CRC ${Number(detalle.total_pagar).toLocaleString()}</strong>.</p>
              <p>¡Gracias por mantener tu membresía al día!</p>
            `
          });

          await Notificacion.registrarEnBitacora({
            usuario_id: detalle.usuario_id,
            tipo_notificacion: 'Comprobante de Pago',
            destinatario_correo: detalle.correo,
            asunto: 'Comprobante de Pago Recibido'
          });
        }
      }

      req.session.mensajeCobros = 'Pago registrado y marcado como recibido exitosamente.';
      res.redirect('/admin/cobros');
    } catch (err) {
      console.error('Error en postRegistrarPago:', err);
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
            .replace('{{monto}}', `CRC ${Number(m.total_pagar).toLocaleString()}`)
            .replace('{{fecha_limite}}', new Date(m.fecha_limite_pago).toLocaleDateString());

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

      req.session.mensajeCobros = `Se enviaron recordatorios de pago a ${morosos.length} socios pendientes.`;
      res.redirect('/admin/cobros');
    } catch (err) {
      console.error('Error en postEnviarRecordatorios:', err);
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
      console.error('Error en getAdminNotificaciones:', err);
      res.redirect('/admin/dashboard');
    }
  },

  async postActualizarPlantilla(req, res) {
    const { clave, asunto, cuerpo } = req.body;
    try {
      await Notificacion.actualizarPlantilla(clave, asunto, cuerpo);
      req.session.mensajePlantilla = 'Plantilla guardada y actualizada con éxito.';
      res.redirect('/admin/notificaciones');
    } catch (err) {
      console.error('Error en postActualizarPlantilla:', err);
      res.redirect('/admin/notificaciones');
    }
  },

  async getAdminBitacora(req, res) {
    try {
      const logs = await Notificacion.listarBitacora();
      res.render('admin/bitacora', { logs });
    } catch (err) {
      console.error('Error en getAdminBitacora:', err);
      res.redirect('/admin/dashboard');
    }
  }
};

module.exports = cobrosController;
