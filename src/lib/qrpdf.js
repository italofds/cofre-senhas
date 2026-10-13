// Monta o PDF (A4) com os QR codes do cofre. Carregado sob demanda (import dinâmico),
// para que jsPDF e o gerador de QR não pesem no carregamento inicial do app.
import { jsPDF } from 'jspdf';
import qrcode from 'qrcode-generator';
import { qrSetId } from './qr.js';

const PAGE_W = 210;
const MARGIN = 15;
const COLS = 2;
const ROWS = 3;
const CELL_W = (PAGE_W - MARGIN * 2) / COLS;
const CELL_H = 84;
const QR_SIZE = 72;
const GRID_TOP = 38;
const APP_URL = 'https://italofds.github.io/cofre-senhas/';
const SITE_QR = 20;
const PER_PAGE = COLS * ROWS;

function drawQr(doc, text, x, y, size, mode = 'Alphanumeric') {
  const qr = qrcode(0, 'M');
  qr.addData(text, mode);
  qr.make();
  const n = qr.getModuleCount();
  const m = size / n;
  const overlap = 0.03; // evita frestas entre módulos vizinhos em alguns visualizadores
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.isDark(r, c)) { c++; continue; }
      let end = c;
      while (end + 1 < n && qr.isDark(r, end + 1)) end++;
      doc.rect(x + c * m, y + r * m, (end - c + 1) * m + overlap, m + overlap, 'F');
      c = end + 1;
    }
  }
}

function drawHeader(doc, name, stamp, total, setId) {
  // QR code do site no canto direito, para quem tiver só o papel saber onde abrir o app
  const siteX = PAGE_W - MARGIN - SITE_QR;
  doc.setFillColor(0, 0, 0);
  drawQr(doc, APP_URL, siteX, 9, SITE_QR, 'Byte');
  doc.setTextColor(90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Acessar o app', siteX + SITE_QR / 2, 9 + SITE_QR + 3.5, { align: 'center' });

  const textW = siteX - MARGIN - 8;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Cofre - ${name}`, MARGIN, 15, { maxWidth: textW });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${stamp}  ·  ${total} QR code${total > 1 ? 's' : ''}  ·  conjunto ${setId}`, MARGIN, 21);
  doc.setTextColor(90);
  doc.setFontSize(8);
  doc.text(
    `Conteúdo criptografado. Abra o app pelo QR code ao lado (${APP_URL}), toque em "Abrir por QR code", leia todos os códigos abaixo e informe a senha mestra.`,
    MARGIN, 26, { maxWidth: textW }
  );
}

// texts: saída de splitToQrTexts · retorna um Blob application/pdf
export function buildQrPdf(texts, { name, stamp }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const total = texts.length;
  const pages = Math.ceil(total / PER_PAGE);
  const setId = qrSetId(texts[0]);

  texts.forEach((text, i) => {
    const slot = i % PER_PAGE;
    const page = Math.floor(i / PER_PAGE);
    if (slot === 0) {
      if (i > 0) doc.addPage();
      drawHeader(doc, name, stamp, total, setId);
      doc.setTextColor(120);
      doc.setFontSize(8);
      doc.text(`Página ${page + 1} de ${pages}`, PAGE_W / 2, 291, { align: 'center' });
    }
    const cellX = MARGIN + (slot % COLS) * CELL_W;
    const y = GRID_TOP + Math.floor(slot / COLS) * CELL_H;
    doc.setFillColor(0, 0, 0);
    drawQr(doc, text, cellX + (CELL_W - QR_SIZE) / 2, y, QR_SIZE);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Parte ${i + 1} de ${total}`, cellX + CELL_W / 2, y + QR_SIZE + 7, { align: 'center' });
  });

  return doc.output('blob');
}
