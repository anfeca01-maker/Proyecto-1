// Sistema de Edición y Emisión de Carnets - GMC Alimentos
// 100% Offline con renderizado reactivo y generación vectorial PDF

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const canvas = document.getElementById('carnetCanvas');
  const ctx = canvas.getContext('2d');

  const consecutivoInput = document.getElementById('consecutivo');
  const btnIncrementar = document.getElementById('btnIncrementar');
  const chkAutoIncrement = document.getElementById('chkAutoIncrement');
  const nombresInput = document.getElementById('nombres');
  const apellidosInput = document.getElementById('apellidos');
  const identificacionInput = document.getElementById('identificacion');
  const fechaExpedicionInput = document.getElementById('fechaExpedicion');
  const fechaVencimientoInput = document.getElementById('fechaVencimiento');
  const btnSumarUnAnio = document.getElementById('btnSumarUnAnio');

  const fotoInput = document.getElementById('fotoInput');
  const photoDropArea = document.getElementById('photoDropArea');
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoPrompt = document.getElementById('photoPrompt');
  const photoThumb = document.getElementById('photoThumb');
  const btnQuitarFoto = document.getElementById('btnQuitarFoto');

  const btnDescargarPdf = document.getElementById('btnDescargarPdf');
  const btnImprimir = document.getElementById('btnImprimir');
  const btnLimpiar = document.getElementById('btnLimpiar');

  // Calibración
  const btnToggleCalibracion = document.getElementById('btnToggleCalibracion');
  const calibracionContent = document.getElementById('calibracionContent');
  const calibracionIcon = document.getElementById('calibracionIcon');
  const calibOffsetX = document.getElementById('calibOffsetX');
  const calibOffsetY = document.getElementById('calibOffsetY');
  const calibFontSizeNombres = document.getElementById('calibFontSizeNombres');
  const calibFontSizeNo = document.getElementById('calibFontSizeNo');
  const btnRestablecerCalib = document.getElementById('btnRestablecerCalib');

  // Zoom
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomFit = document.getElementById('btnZoomFit');
  const zoomLevelLabel = document.getElementById('zoomLevel');
  const canvasWrapper = document.getElementById('canvasWrapper');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Lotes y Historial
  const lotesInput = document.getElementById('lotesInput');
  const lotesConsecutivoInicio = document.getElementById('lotesConsecutivoInicio');
  const btnProcesarLote = document.getElementById('btnProcesarLote');
  const lotesStatus = document.getElementById('lotesStatus');
  const historialBody = document.getElementById('historialBody');
  const btnBorrarHistorial = document.getElementById('btnBorrarHistorial');

  // State
  let baseImage = new Image();
  let userPhotoImage = null;
  let userPhotoRawBytes = null;
  let userPhotoMime = null;
  let zoom = 1;
  let isFitZoom = true;

  // Initial values setup
  const hoy = new Date();
  const unAnioDespues = new Date();
  unAnioDespues.setFullYear(hoy.getFullYear() + 1);

  fechaExpedicionInput.value = formatDateYMD(hoy);
  fechaVencimientoInput.value = formatDateYMD(unAnioDespues);

  // Load saved consecutivo
  const savedConsecutivo = localStorage.getItem('carnet_ultimo_consecutivo') || '000125';
  consecutivoInput.value = savedConsecutivo;
  lotesConsecutivoInicio.value = savedConsecutivo;

  // Load Base Image
  baseImage.onload = () => {
    updatePreview();
    adjustFitZoom();
  };
  baseImage.src = CARNET_BASE_IMAGE;

  // -------------------------------------------------------------
  // VALIDACIONES Y EVENTOS DE ENTRADA
  // -------------------------------------------------------------

  // REGLA CRÍTICA: Identificación SOLO admite números
  identificacionInput.addEventListener('input', (e) => {
    const clean = e.target.value.replace(/\D/g, '');
    if (e.target.value !== clean) {
      e.target.value = clean;
      showToast('⚠️ Solo se admiten números en Identificación', 'warning');
    }
    updatePreview();
  });

  // Nombres y Apellidos en mayúsculas
  nombresInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    updatePreview();
  });

  apellidosInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
    updatePreview();
  });

  consecutivoInput.addEventListener('input', updatePreview);
  fechaExpedicionInput.addEventListener('change', updatePreview);
  fechaVencimientoInput.addEventListener('change', updatePreview);

  // Botón +1 Consecutivo
  btnIncrementar.addEventListener('click', () => {
    consecutivoInput.value = incrementarConsecutivo(consecutivoInput.value);
    updatePreview();
  });

  // Botón Fijar Vencimiento a 1 año
  btnSumarUnAnio.addEventListener('click', () => {
    if (fechaExpedicionInput.value) {
      const expDate = new Date(fechaExpedicionInput.value + 'T00:00:00');
      expDate.setFullYear(expDate.getFullYear() + 1);
      fechaVencimientoInput.value = formatDateYMD(expDate);
      updatePreview();
      showToast('📅 Vencimiento fijado a 1 año');
    }
  });

  // -------------------------------------------------------------
  // GESTIÓN DE FOTOGRAFÍA (OPCIONAL)
  // -------------------------------------------------------------
  photoDropArea.addEventListener('click', (e) => {
    if (e.target !== btnQuitarFoto) {
      fotoInput.click();
    }
  });

  photoDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoDropArea.style.borderColor = 'var(--secondary)';
  });

  photoDropArea.addEventListener('dragleave', () => {
    photoDropArea.style.borderColor = '#cbd5e1';
  });

  photoDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    photoDropArea.style.borderColor = '#cbd5e1';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  });

  fotoInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoFile(e.target.files[0]);
    }
  });

  btnQuitarFoto.addEventListener('click', (e) => {
    e.stopPropagation();
    userPhotoImage = null;
    userPhotoRawBytes = null;
    userPhotoMime = null;
    fotoInput.value = '';
    photoPreviewContainer.style.display = 'none';
    photoPrompt.style.display = 'block';
    updatePreview();
  });

  function handlePhotoFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido', 'error');
      return;
    }
    userPhotoMime = file.type;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        userPhotoImage = img;
        photoThumb.src = event.target.result;
        photoPrompt.style.display = 'none';
        photoPreviewContainer.style.display = 'block';
        updatePreview();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // Also read array buffer for pdf-lib embedding
    const bufferReader = new FileReader();
    bufferReader.onload = (ev) => {
      userPhotoRawBytes = new Uint8Array(ev.target.result);
    };
    bufferReader.readAsArrayBuffer(file);
  }

  // -------------------------------------------------------------
  // VISTA PREVIA EN CANVAS
  // -------------------------------------------------------------
  function updatePreview() {
    if (!baseImage.complete) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base template
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    const offX = parseInt(calibOffsetX.value, 10) || 0;
    const offY = parseInt(calibOffsetY.value, 10) || 0;
    const fontSizeNombres = parseInt(calibFontSizeNombres.value, 10) || 44;
    const fontSizeNo = parseInt(calibFontSizeNo.value, 10) || 46;

    // 1. Dibujar Foto 3x4 (si existe)
    // Coordenadas recuadro foto: x: 998, y: 61, ancho: 371, alto: 420
    if (userPhotoImage) {
      drawCoverImage(ctx, userPhotoImage, 998, 61, 371, 420);
    }

    // 2. Número de Consecutivo (Centrado en el recuadro "No." - Color Negro)
    const consecutivo = consecutivoInput.value.trim() || '000125';
    ctx.font = `bold ${fontSizeNo}px Arial, sans-serif`;
    ctx.fillStyle = '#0a1428';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(consecutivo, 735 + offX, 122 + offY);

    // 3. Nombres, Apellidos, Identificación (Tamaño aumentado a 44px)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0a1428';
    ctx.font = `bold ${fontSizeNombres}px Arial, sans-serif`;

    const nombres = nombresInput.value.trim();
    if (nombres) {
      ctx.fillText(nombres, 345 + offX, 494 + offY);
    }

    const apellidos = apellidosInput.value.trim();
    if (apellidos) {
      ctx.fillText(apellidos, 345 + offX, 569 + offY);
    }

    // Identificación: SOLO NÚMEROS (garantizado)
    const identificacion = identificacionInput.value.trim().replace(/\D/g, '');
    if (identificacion) {
      ctx.fillText(identificacion, 385 + offX, 644 + offY);
    }

    // 4. Fechas (Día, Mes, Año - Tamaño aumentado a 36px)
    ctx.font = `bold 36px Arial, sans-serif`;

    const expParts = parseDateParts(fechaExpedicionInput.value);
    if (expParts) {
      ctx.fillText(expParts.dia, 675 + offX, 724 + offY);
      ctx.fillText(expParts.mes, 960 + offX, 724 + offY);
      ctx.fillText(expParts.anio, 1215 + offX, 724 + offY);
    }

    const vencParts = parseDateParts(fechaVencimientoInput.value);
    if (vencParts) {
      ctx.fillText(vencParts.dia, 675 + offX, 799 + offY);
      ctx.fillText(vencParts.mes, 960 + offX, 799 + offY);
      ctx.fillText(vencParts.anio, 1215 + offX, 799 + offY);
    }
  }

  // Draw image with object-fit cover
  function drawCoverImage(context, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > targetRatio) {
      sh = img.height;
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = img.width / targetRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }

    context.save();
    context.beginPath();
    context.rect(x, y, w, h);
    context.clip();
    context.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    context.restore();
  }

  function parseDateParts(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return {
      anio: parts[0],
      mes: parts[1],
      dia: parts[2]
    };
  }

  function formatDateYMD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function incrementarConsecutivo(val) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return '000001';
    const next = num + 1;
    const len = Math.max(val.length, 6);
    return String(next).padStart(len, '0');
  }

  // -------------------------------------------------------------
  // GENERACIÓN DE PDF VECTORIAL EN ALTA DEFINICIÓN
  // -------------------------------------------------------------
  async function generarPdfDocument(data) {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 estándar

    // Decodificar imagen de fondo limpia (sin marcas de agua)
    const binaryString = atob(CARNET_BASE_BASE64);
    const bgBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bgBytes[i] = binaryString.charCodeAt(i);
    }
    const bgImage = await pdfDoc.embedJpg(bgBytes);
    page.drawImage(bgImage, {
      x: 0,
      y: 75.125,
      width: 595,
      height: 743.75,
    });

    // Embed Foto si existe
    if (data.photoBytes) {
      try {
        let photoEmbed;
        if (data.photoMime && data.photoMime.includes('png')) {
          photoEmbed = await pdfDoc.embedPng(data.photoBytes);
        } else {
          photoEmbed = await pdfDoc.embedJpg(data.photoBytes);
        }
        // Recuadro foto en PDF: x: 412, y: 619.7, ancho: 153.3, alto: 173.6
        page.drawImage(photoEmbed, {
          x: 412,
          y: 619.7,
          width: 153.3,
          height: 173.6
        });
      } catch (err) {
        console.warn('No se pudo incrustar la foto como imagen directa, continuando...', err);
      }
    }

    const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    const scale = 595.0 / 1440.0;
    const offXPt = (parseInt(calibOffsetX.value, 10) || 0) * scale;
    const offYPt = -(parseInt(calibOffsetY.value, 10) || 0) * scale;

    // 1. Consecutivo en Negro
    const noStr = data.consecutivo || '000125';
    const noFontSize = (parseInt(calibFontSizeNo.value, 10) || 46) * scale * 0.9;
    const noWidth = fontBold.widthOfTextAtSize(noStr, noFontSize);
    const noBoxCenter = 303.7; // Centro del recuadro "No."
    page.drawText(noStr, {
      x: noBoxCenter - (noWidth / 2) + offXPt,
      y: 760 + offYPt,
      size: noFontSize,
      font: fontBold,
      color: PDFLib.rgb(0.04, 0.08, 0.16),
    });

    // 2. Nombres, Apellidos, Identificación (Tamaño aumentado)
    const textFontSize = (parseInt(calibFontSizeNombres.value, 10) || 44) * scale;
    const darkColor = PDFLib.rgb(0.04, 0.08, 0.16);

    if (data.nombres) {
      page.drawText(data.nombres.toUpperCase(), {
        x: 142.5 + offXPt,
        y: 605 + offYPt,
        size: textFontSize,
        font: fontBold,
        color: darkColor,
      });
    }

    if (data.apellidos) {
      page.drawText(data.apellidos.toUpperCase(), {
        x: 142.5 + offXPt,
        y: 574 + offYPt,
        size: textFontSize,
        font: fontBold,
        color: darkColor,
      });
    }

    // Identificación: SOLO NÚMEROS (reemplazo estricto)
    const idClean = (data.identificacion || '').replace(/\D/g, '');
    if (idClean) {
      page.drawText(idClean, {
        x: 159 + offXPt,
        y: 543 + offYPt,
        size: textFontSize,
        font: fontBold,
        color: darkColor,
      });
    }

    // 3. Fechas (Tamaño aumentado)
    const dateFontSize = 36 * scale;
    if (data.expParts) {
      page.drawText(data.expParts.dia, { x: 279 + offXPt, y: 512 + offYPt, size: dateFontSize, font: fontBold, color: darkColor });
      page.drawText(data.expParts.mes, { x: 396 + offXPt, y: 512 + offYPt, size: dateFontSize, font: fontBold, color: darkColor });
      page.drawText(data.expParts.anio, { x: 501 + offXPt, y: 512 + offYPt, size: dateFontSize, font: fontBold, color: darkColor });
    }

    if (data.vencParts) {
      page.drawText(data.vencParts.dia, { x: 279 + offXPt, y: 481 + offYPt, size: dateFontSize, font: fontBold, color: darkColor });
      page.drawText(data.vencParts.mes, { x: 396 + offXPt, y: 481 + offYPt, size: dateFontSize, font: fontBold, color: darkColor });
      page.drawText(data.vencParts.anio, { x: 501 + offXPt, y: 481 + offYPt, size: dateFontSize, font: fontBold, color: darkColor });
    }

    return pdfDoc;
  }

  // Descarga del PDF individual
  btnDescargarPdf.addEventListener('click', async () => {
    const consecutivo = consecutivoInput.value.trim() || '000125';
    const nombres = nombresInput.value.trim();
    const apellidos = apellidosInput.value.trim();
    const identificacion = identificacionInput.value.trim().replace(/\D/g, '');
    const expParts = parseDateParts(fechaExpedicionInput.value);
    const vencParts = parseDateParts(fechaVencimientoInput.value);

    btnDescargarPdf.disabled = true;
    btnDescargarPdf.textContent = '⏳ Generando...';

    try {
      const pdfDoc = await generarPdfDocument({
        consecutivo,
        nombres,
        apellidos,
        identificacion,
        expParts,
        vencParts,
        photoBytes: userPhotoRawBytes,
        photoMime: userPhotoMime
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeName = (nombres ? `${nombres}_${apellidos}` : 'Carnet').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Carnet_${consecutivo}_${safeName}.pdf`;
      link.click();

      // Guardar en historial
      guardarEnHistorial({
        consecutivo,
        nombres: `${nombres} ${apellidos}`.trim() || 'Sin Nombre',
        identificacion: identificacion || 'S/N',
        fecha: fechaExpedicionInput.value || formatDateYMD(new Date())
      });

      // Auto-incrementar
      if (chkAutoIncrement.checked) {
        const nextCon = incrementarConsecutivo(consecutivo);
        consecutivoInput.value = nextCon;
        localStorage.setItem('carnet_ultimo_consecutivo', nextCon);
        updatePreview();
      } else {
        localStorage.setItem('carnet_ultimo_consecutivo', consecutivo);
      }

      showToast(`✅ Carnet #${consecutivo} descargado exitosamente`);
    } catch (err) {
      console.error(err);
      showToast('❌ Error al generar el PDF', 'error');
    } finally {
      btnDescargarPdf.disabled = false;
      btnDescargarPdf.textContent = '📥 Descargar PDF';
    }
  });

  // Imprimir Directo
  btnImprimir.addEventListener('click', () => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impresión de Carnet - GMC Alimentos</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: white; }
          img { width: 100%; height: auto; max-width: 210mm; display: block; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); window.close();" />
      </body>
      </html>
    `);
    printWin.document.close();
  });

  // Limpiar Formulario
  btnLimpiar.addEventListener('click', () => {
    nombresInput.value = '';
    apellidosInput.value = '';
    identificacionInput.value = '';
    btnQuitarFoto.click();
    updatePreview();
    showToast('Formulario restablecido');
  });

  // -------------------------------------------------------------
  // CALIBRACIÓN
  // -------------------------------------------------------------
  btnToggleCalibracion.addEventListener('click', () => {
    const isOpen = calibracionContent.classList.toggle('open');
    calibracionIcon.textContent = isOpen ? '▲' : '▼';
  });

  [calibOffsetX, calibOffsetY, calibFontSizeNombres, calibFontSizeNo].forEach(el => {
    el.addEventListener('input', updatePreview);
  });

  btnRestablecerCalib.addEventListener('click', () => {
    calibOffsetX.value = 0;
    calibOffsetY.value = 0;
    calibFontSizeNombres.value = 44;
    calibFontSizeNo.value = 46;
    updatePreview();
    showToast('Calibración restablecida');
  });

  // -------------------------------------------------------------
  // ZOOM Y VISTA PREVIA
  // -------------------------------------------------------------
  function adjustFitZoom() {
    const viewport = document.getElementById('previewViewport');
    const availableWidth = viewport.clientWidth - 60;
    const targetScale = Math.min(1, availableWidth / 1440);
    applyZoom(targetScale);
    isFitZoom = true;
    zoomLevelLabel.textContent = 'Ajustar';
  }

  function applyZoom(val) {
    zoom = Math.max(0.25, Math.min(1.5, val));
    canvas.style.width = `${Math.round(1440 * zoom)}px`;
    canvas.style.height = `${Math.round(1800 * zoom)}px`;
    if (!isFitZoom) {
      zoomLevelLabel.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  btnZoomIn.addEventListener('click', () => {
    isFitZoom = false;
    applyZoom(zoom + 0.1);
  });

  btnZoomOut.addEventListener('click', () => {
    isFitZoom = false;
    applyZoom(zoom - 0.1);
  });

  btnZoomFit.addEventListener('click', adjustFitZoom);
  window.addEventListener('resize', () => {
    if (isFitZoom) adjustFitZoom();
  });

  // -------------------------------------------------------------
  // TABS
  // -------------------------------------------------------------
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.style.display = 'block';

      if (btn.dataset.tab === 'tab-historial') {
        renderizarHistorial();
      }
    });
  });

  // -------------------------------------------------------------
  // EMISIÓN POR LOTES (BATCH)
  // -------------------------------------------------------------
  btnProcesarLote.addEventListener('click', async () => {
    const rawText = lotesInput.value.trim();
    if (!rawText) {
      showToast('Por favor escribe al menos una persona en el lote', 'warning');
      return;
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let startCon = lotesConsecutivoInicio.value.trim() || '000126';
    const expParts = parseDateParts(fechaExpedicionInput.value);
    const vencParts = parseDateParts(fechaVencimientoInput.value);

    btnProcesarLote.disabled = true;
    lotesStatus.textContent = `Generando 0 / ${lines.length} carnets...`;

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      const binaryString = atob(CARNET_BASE_BASE64);
      const bgBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bgBytes[i] = binaryString.charCodeAt(i);
      const bgImage = await mergedPdf.embedJpg(bgBytes);
      const fontBold = await mergedPdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const scale = 595.0 / 1440.0;
      const textFontSize = 44 * scale;
      const noFontSize = 46 * scale * 0.9;
      const dateFontSize = 36 * scale;
      const darkColor = PDFLib.rgb(0.04, 0.08, 0.16);

      let currentCon = startCon;

      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const nombres = (parts[0] || '').toUpperCase();
        const apellidos = (parts[1] || '').toUpperCase();
        // Identificación: SOLO NÚMEROS
        const identificacion = (parts[2] || '').replace(/\D/g, '');

        const page = mergedPdf.addPage([595, 842]);
        page.drawImage(bgImage, { x: 0, y: 75.125, width: 595, height: 743.75 });

        // No. (Color Negro)
        const noWidth = fontBold.widthOfTextAtSize(currentCon, noFontSize);
        page.drawText(currentCon, {
          x: 303.7 - (noWidth / 2),
          y: 760,
          size: noFontSize,
          font: fontBold,
          color: darkColor,
        });

        // Nombres, Apellidos, Identificación
        if (nombres) page.drawText(nombres, { x: 142.5, y: 605, size: textFontSize, font: fontBold, color: darkColor });
        if (apellidos) page.drawText(apellidos, { x: 142.5, y: 574, size: textFontSize, font: fontBold, color: darkColor });
        if (identificacion) page.drawText(identificacion, { x: 159, y: 543, size: textFontSize, font: fontBold, color: darkColor });

        // Fechas
        if (expParts) {
          page.drawText(expParts.dia, { x: 279, y: 512, size: dateFontSize, font: fontBold, color: darkColor });
          page.drawText(expParts.mes, { x: 396, y: 512, size: dateFontSize, font: fontBold, color: darkColor });
          page.drawText(expParts.anio, { x: 501, y: 512, size: dateFontSize, font: fontBold, color: darkColor });
        }
        if (vencParts) {
          page.drawText(vencParts.dia, { x: 279, y: 481, size: dateFontSize, font: fontBold, color: darkColor });
          page.drawText(vencParts.mes, { x: 396, y: 481, size: dateFontSize, font: fontBold, color: darkColor });
          page.drawText(vencParts.anio, { x: 501, y: 481, size: dateFontSize, font: fontBold, color: darkColor });
        }

        guardarEnHistorial({
          consecutivo: currentCon,
          nombres: `${nombres} ${apellidos}`.trim() || 'Sin Nombre',
          identificacion: identificacion || 'S/N',
          fecha: fechaExpedicionInput.value || formatDateYMD(new Date())
        });

        currentCon = incrementarConsecutivo(currentCon);
        lotesStatus.textContent = `Generando ${i + 1} / ${lines.length} carnets...`;
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Carnets_Lote_${startCon}_a_${currentCon}.pdf`;
      link.click();

      consecutivoInput.value = currentCon;
      localStorage.setItem('carnet_ultimo_consecutivo', currentCon);
      lotesConsecutivoInicio.value = currentCon;
      updatePreview();

      lotesStatus.textContent = `✅ ¡Lote de ${lines.length} carnets generado y descargado!`;
      showToast(`✅ Se generó el PDF con ${lines.length} carnets`);
    } catch (err) {
      console.error(err);
      lotesStatus.textContent = '❌ Error procesando el lote.';
      showToast('Error generando el lote', 'error');
    } finally {
      btnProcesarLote.disabled = false;
    }
  });

  // -------------------------------------------------------------
  // HISTORIAL LOCAL
  // -------------------------------------------------------------
  function guardarEnHistorial(item) {
    const list = JSON.parse(localStorage.getItem('carnet_historial') || '[]');
    list.unshift(item);
    if (list.length > 50) list.pop();
    localStorage.setItem('carnet_historial', JSON.stringify(list));
  }

  function renderizarHistorial() {
    const list = JSON.parse(localStorage.getItem('carnet_historial') || '[]');
    if (list.length === 0) {
      historialBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay carnets emitidos recientemente</td></tr>';
      return;
    }
    historialBody.innerHTML = list.map(item => `
      <tr>
        <td><strong style="color: var(--danger);">${escapeHtml(item.consecutivo)}</strong></td>
        <td>${escapeHtml(item.nombres)}</td>
        <td>${escapeHtml(item.identificacion)}</td>
        <td>${escapeHtml(item.fecha)}</td>
      </tr>
    `).join('');
  }

  btnBorrarHistorial.addEventListener('click', () => {
    if (confirm('¿Deseas vaciar el historial de carnets emitidos?')) {
      localStorage.removeItem('carnet_historial');
      renderizarHistorial();
      showToast('Historial vaciado');
    }
  });

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // -------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // -------------------------------------------------------------
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');
  let toastTimer = null;

  function showToast(msg, type = 'success') {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    toastIcon.textContent = type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✅');
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  }
});
