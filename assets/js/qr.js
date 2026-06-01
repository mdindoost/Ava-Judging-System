/**
 * qr.js — Ava Judging System
 * QR code generation, download, and bulk ZIP export.
 * Uses QRCode.js (CDN) for canvas rendering and JSZip (CDN) for bulk ZIP.
 */

import { CONFIG, voteURL, judgeLoginURL } from './config.js';

const QRCODE_CDN = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
const JSZIP_CDN  = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

let _qrCodeLoaded  = false;
let _jsZipLoaded   = false;

async function _ensureQRCode() {
  if (_qrCodeLoaded || typeof QRCode !== 'undefined') {
    _qrCodeLoaded = true;
    return;
  }
  await _loadScript(QRCODE_CDN);
  _qrCodeLoaded = true;
}

async function _ensureJSZip() {
  if (_jsZipLoaded || typeof JSZip !== 'undefined') {
    _jsZipLoaded = true;
    return;
  }
  await _loadScript(JSZIP_CDN);
  _jsZipLoaded = true;
}

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/* ============================================================
   URL HELPERS
   ============================================================ */

/**
 * Returns the full audience vote URL for a presenter.
 * @param {string} presenterId
 * @returns {string}
 */
export function generatePresenterQRURL(presenterId) {
  return voteURL(presenterId);
}

/**
 * Returns the full judge login URL containing the judge's token.
 * @param {string} token
 * @returns {string}
 */
export function generateJudgeQRURL(token) {
  return judgeLoginURL(token);
}

/* ============================================================
   RENDER QR CODE INTO A CONTAINER DIV
   ============================================================ */

/**
 * Renders a QR code into a DOM container element.
 * Clears any previous QR code in the container first.
 *
 * @param {string|HTMLElement} containerOrId - The container div element or its ID.
 * @param {string} text - The URL or text to encode.
 * @param {object} [opts] - Override QR options.
 * @param {number} [opts.size]
 * @param {string} [opts.colorDark]
 * @param {string} [opts.colorLight]
 * @param {string} [opts.correctLevel] - 'L', 'M', 'Q', 'H'
 * @returns {Promise<void>}
 */
export async function renderQRToContainer(containerOrId, text, opts = {}) {
  await _ensureQRCode();

  const container = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;

  if (!container) throw new Error(`QR container not found: ${containerOrId}`);

  container.innerHTML = '';

  new QRCode(container, {
    text,
    width:        opts.size         ?? CONFIG.QR.SIZE,
    height:       opts.size         ?? CONFIG.QR.SIZE,
    colorDark:    opts.colorDark    ?? CONFIG.QR.COLOR_DARK,
    colorLight:   opts.colorLight   ?? CONFIG.QR.COLOR_LIGHT,
    correctLevel: QRCode.CorrectLevel[opts.correctLevel ?? CONFIG.QR.ERROR_CORRECTION] ?? QRCode.CorrectLevel.M,
  });
}

/**
 * Renders a QR code into a <canvas> element.
 * The canvas will be sized to opts.size × opts.size.
 *
 * @param {string} canvasId
 * @param {string} text
 * @param {object} [opts]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderQRToCanvas(canvasId, text, opts = {}) {
  await _ensureQRCode();

  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  // QRCode.js renders to a div; we proxy through a temp div and copy to canvas
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  document.body.appendChild(tempDiv);

  new QRCode(tempDiv, {
    text,
    width:        opts.size         ?? CONFIG.QR.SIZE,
    height:       opts.size         ?? CONFIG.QR.SIZE,
    colorDark:    opts.colorDark    ?? CONFIG.QR.COLOR_DARK,
    colorLight:   opts.colorLight   ?? CONFIG.QR.COLOR_LIGHT,
    correctLevel: QRCode.CorrectLevel[opts.correctLevel ?? CONFIG.QR.ERROR_CORRECTION] ?? QRCode.CorrectLevel.M,
  });

  // QRCode.js creates an <img> after a short render tick
  await new Promise(r => setTimeout(r, 80));

  const size = opts.size ?? CONFIG.QR.SIZE;
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const img = tempDiv.querySelector('img');
  if (img && img.complete) {
    ctx.drawImage(img, 0, 0, size, size);
  } else if (img) {
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    ctx.drawImage(img, 0, 0, size, size);
  }

  document.body.removeChild(tempDiv);
  return canvas;
}

/* ============================================================
   GENERATE QR AS DATA URL (PNG)
   ============================================================ */

/**
 * Generates a QR code and returns it as a PNG data URL.
 * Used for ZIP export and PDF embedding.
 *
 * @param {string} text
 * @param {object} [opts]
 * @returns {Promise<string>} PNG data URL
 */
export async function generateQRDataURL(text, opts = {}) {
  await _ensureQRCode();

  const size = opts.size ?? CONFIG.QR.SIZE;

  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(tempDiv);

  new QRCode(tempDiv, {
    text,
    width:        size,
    height:       size,
    colorDark:    opts.colorDark    ?? CONFIG.QR.COLOR_DARK,
    colorLight:   opts.colorLight   ?? CONFIG.QR.COLOR_LIGHT,
    correctLevel: QRCode.CorrectLevel[opts.correctLevel ?? CONFIG.QR.ERROR_CORRECTION] ?? QRCode.CorrectLevel.M,
  });

  await new Promise(r => setTimeout(r, 100));

  const img = tempDiv.querySelector('img');
  let dataURL = '';

  if (img) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const loadImg = img.complete
      ? Promise.resolve()
      : new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    await loadImg;
    ctx.drawImage(img, 0, 0, size, size);
    dataURL = canvas.toDataURL('image/png');
  }

  document.body.removeChild(tempDiv);
  return dataURL;
}

/* ============================================================
   DOWNLOAD SINGLE QR AS PNG
   ============================================================ */

/**
 * Generates a QR code for a presenter and triggers a PNG download.
 * @param {string} presenterId
 * @param {string} presenterName - Used as the filename.
 * @param {object} [opts]
 * @returns {Promise<void>}
 */
export async function downloadQRAsPNG(presenterId, presenterName, opts = {}) {
  const url = generatePresenterQRURL(presenterId);
  const dataURL = await generateQRDataURL(url, opts);

  if (!dataURL) throw new Error('QR generation failed');

  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `QR-${presenterId}-${_sanitizeFilename(presenterName)}.png`;
  a.click();
}

/* ============================================================
   BULK ZIP EXPORT
   ============================================================ */

/**
 * Generates QR codes for all presenters and packages them as a ZIP.
 * Each file is named QR-{ID}-{Name}.png.
 *
 * @param {Array<{ID: string, Name: string}>} presenters
 * @param {object} [opts] - QR options
 * @param {Function} [onProgress] - Called with (done, total) after each QR
 * @returns {Promise<void>} Triggers browser download of the ZIP file.
 */
export async function generateAllQRsAsZIP(presenters, opts = {}, onProgress) {
  await _ensureJSZip();

  const zip = new JSZip();
  const folder = zip.folder('ava-qr-codes');
  const total = presenters.length;

  for (let i = 0; i < presenters.length; i++) {
    const p = presenters[i];
    const url = generatePresenterQRURL(p.ID);

    let dataURL = '';
    try {
      dataURL = await generateQRDataURL(url, opts);
    } catch {
      if (CONFIG.DEBUG) console.warn('[QR]', 'Failed to generate QR for', p.ID);
      if (onProgress) onProgress(i + 1, total);
      continue;
    }

    // Convert data URL to binary blob for ZIP
    const base64 = dataURL.split(',')[1];
    const filename = `QR-${p.ID}-${_sanitizeFilename(p.Name)}.png`;
    folder.file(filename, base64, { base64: true });

    if (onProgress) onProgress(i + 1, total);
    // Yield to keep the UI responsive
    if (i % 5 === 4) await new Promise(r => setTimeout(r, 0));
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  _triggerDownload(blob, 'ava-qr-codes.zip', 'application/zip');
}

/* ============================================================
   QR POSTER CARD HTML ELEMENT
   Used by the print/PDF layout in qr-manager.html
   ============================================================ */

/**
 * Creates and returns an HTML element representing a printable QR poster card.
 * The caller must append it to the DOM; after rendering call generateQRDataURL()
 * to attach the QR image.
 *
 * @param {{ ID: string, Name: string, Department?: string, Track?: string, PosterNumber?: string }} presenter
 * @param {{ eventName?: string, eventDate?: string }} eventData
 * @returns {HTMLElement}
 */
export function buildQRPosterCard(presenter, eventData = {}) {
  const card = document.createElement('div');
  card.className = 'qr-poster-card';
  card.innerHTML = `
    <div class="qr-poster-card__header">
      <span class="qr-poster-card__app">Ava Judging System</span>
    </div>
    <div class="qr-poster-card__presenter">${_esc(presenter.Name)}</div>
    <div class="qr-poster-card__meta">
      ${presenter.PosterNumber ? `<span>Poster ${_esc(presenter.PosterNumber)}</span>` : ''}
      ${presenter.Department ? `<span>${_esc(presenter.Department)}</span>` : ''}
      ${presenter.Track ? `<span>${_esc(presenter.Track)}</span>` : ''}
    </div>
    <div class="qr-poster-card__qr" id="qr-card-${_esc(presenter.ID)}">
      <!-- QR rendered here -->
    </div>
    <div class="qr-poster-card__cta">Scan to Rate This Presentation</div>
    <div class="qr-poster-card__footer">
      ${eventData.eventName ? _esc(eventData.eventName) : ''}
      ${eventData.eventDate ? ` · ${_esc(eventData.eventDate)}` : ''}
    </div>
  `;
  return card;
}

/* ============================================================
   HELPERS
   ============================================================ */

function _sanitizeFilename(name) {
  return (name || 'unknown')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

function _triggerDownload(blob, filename, mimeType) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
