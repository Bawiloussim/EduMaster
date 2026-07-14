const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const https = require('https');
const PDFDocument = require('pdfkit');
const { getAppreciation } = require('../utils/appreciation');

// Global fetch() (undici) throws "Promise.withResolvers is not a function"
// on some Node 20.x builds — use the plain http/https client instead.
function fetchBuffer(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

// School logo is stored as either a Cloudinary URL or a local "/uploads/xxx"
// path (see middlewares/upload.js#getFileUrl) — fetch either into a buffer
// pdfkit's doc.image() can embed. Returns null (never throws) so a school
// without a logo, or a broken/unreachable one, just renders without one.
async function loadLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (/^https?:\/\//i.test(logoUrl)) return await fetchBuffer(logoUrl);
    return await fs.readFile(path.join(__dirname, '../uploads', path.basename(logoUrl)));
  } catch {
    return null;
  }
}

/**
 * Generate a school bulletin PDF (A4 portrait).
 *
 * @param {Object} data
 * @param {number}   data.trimestre
 * @param {Array}    data.bulletin         — array of subject rows
 * @param {string}   data.bulletin[].course.subject
 * @param {Array}    data.bulletin[].evaluations  — [{type, sequence, score20}]
 * @param {number}   data.bulletin[].moyenne
 * @param {string}   data.bulletin[].appreciation
 * @param {number}   data.moyenneGenerale
 * @param {string}   data.studentName
 * @param {Object}   [data.school]          — {name, logo, city, address}
 * @returns {Promise<Buffer>}
 */
async function generateBulletinPDF(data) {
  const { trimestre, bulletin, moyenneGenerale, studentName, school } = data;
  const logoBuffer = await loadLogoBuffer(school?.logo);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const NAVY = '#003580';
      const LIGHT_BLUE = '#e8f0fb';
      const GRAY = '#6b7280';
      const BLACK = '#111827';
      const PAGE_W = doc.page.width - 80; // usable width (margins: 40 each side)
      const LEFT = 40;

      // ── Header — school identity ───────────────────────────────────────────────
      const LOGO_SIZE = 56;
      const logoTop = 40;
      const textX = logoBuffer ? LEFT + LOGO_SIZE + 12 : LEFT;
      const textW = PAGE_W - (logoBuffer ? LOGO_SIZE + 12 : 0);

      if (logoBuffer) {
        try { doc.image(logoBuffer, LEFT, logoTop, { width: LOGO_SIZE, height: LOGO_SIZE, fit: [LOGO_SIZE, LOGO_SIZE] }); } catch { /* corrupt/unsupported image — skip it */ }
      }

      doc.fillColor(NAVY).fontSize(16).font('Helvetica-Bold')
        .text(school?.name || 'Établissement', textX, logoTop + 4, { width: textW });

      const addressLine = [school?.address, school?.city].filter(Boolean).join(', ');
      if (addressLine) {
        doc.fillColor(GRAY).fontSize(9).font('Helvetica')
          .text(addressLine, textX, doc.y + 2, { width: textW });
      }

      let headY = Math.max(logoTop + LOGO_SIZE, doc.y) + 14;

      doc.fillColor(NAVY).fontSize(16).font('Helvetica-Bold')
        .text('BULLETIN SCOLAIRE', LEFT, headY, { align: 'center', width: PAGE_W });
      headY = doc.y + 4;

      doc.fillColor(GRAY).fontSize(11).font('Helvetica')
        .text(`Trimestre : ${trimestre}`, LEFT, headY, { align: 'center', width: PAGE_W });
      headY = doc.y + 2;

      doc.fillColor(BLACK).fontSize(12).font('Helvetica-Bold')
        .text(`Élève : ${studentName || 'N/A'}`, LEFT, headY, { align: 'center', width: PAGE_W });
      headY = doc.y + 2;

      doc.fillColor(GRAY).fontSize(10).font('Helvetica')
        .text(
          `Généré le : ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          LEFT, headY, { align: 'center', width: PAGE_W }
        );
      headY = doc.y + 10;

      // Separator line
      doc.moveTo(LEFT, headY).lineTo(LEFT + PAGE_W, headY).lineWidth(1.5).strokeColor(NAVY).stroke();

      // ── Table ─────────────────────────────────────────────────────────────────
      const TABLE_TOP = headY + 12;
      const HEADER_ROW_H = 22;
      const ROW_H = 42; // tall enough for the professeur column's name + signature line

      // Column widths — declared in order, x positions computed cumulatively so
      // resizing one column never requires re-deriving every one after it. The
      // last column (appréciation) absorbs whatever width remains.
      const COLUMN_SPECS = [
        { key: 'subject',      label: 'Matière',      w: 95 },
        { key: 'interro1',     label: 'Interro 1',    w: 42 },
        { key: 'interro2',     label: 'Interro 2',    w: 42 },
        { key: 'devoir',       label: 'Devoir',       w: 42 },
        { key: 'compos',       label: 'Compos.',      w: 48 },
        { key: 'moyenne',      label: 'Moy./20',      w: 48 },
        { key: 'professeur',   label: 'Professeur',   w: 90 },
        { key: 'appreciation', label: 'Appréciation', w: null },
      ];
      const cols = {};
      let runningX = LEFT;
      COLUMN_SPECS.forEach(({ key, w }) => {
        const width = w ?? (PAGE_W - (runningX - LEFT));
        cols[key] = { x: runningX, w: width };
        runningX += width;
      });

      // Header row
      doc.rect(LEFT, TABLE_TOP, PAGE_W, HEADER_ROW_H).fill(NAVY);
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

      COLUMN_SPECS.forEach(({ key, label }) => {
        const col = cols[key];
        doc.text(label, col.x + 3, TABLE_TOP + 7, { width: col.w - 6, align: 'center' });
      });

      // Subject rows
      let y = TABLE_TOP + HEADER_ROW_H;
      bulletin.forEach((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : LIGHT_BLUE;
        doc.rect(LEFT, y, PAGE_W, ROW_H).fill(bg);

        // Helper to get score for a given type+sequence
        const getScore = (type, seq) => {
          const ev = (row.evaluations || []).find(e => e.type === type && e.sequence === seq);
          if (!ev) return '-';
          if (ev.grade && ev.grade.absent) return 'Abs';
          if (ev.score20 !== null && ev.score20 !== undefined) return ev.score20.toFixed(2);
          return '-';
        };

        const cells = [
          { key: 'subject',      text: (row.course && row.course.subject) || '-' },
          { key: 'interro1',     text: getScore('interrogation', 1) },
          { key: 'interro2',     text: getScore('interrogation', 2) },
          { key: 'devoir',       text: getScore('devoir', 1) },
          { key: 'compos',       text: getScore('composition', 1) },
          { key: 'moyenne',      text: row.moyenne !== null && row.moyenne !== undefined ? String(row.moyenne) : '-' },
        ];

        doc.fillColor(BLACK).fontSize(9).font('Helvetica');
        cells.forEach(({ key, text }) => {
          const col = cols[key];
          const align = key === 'subject' ? 'left' : 'center';
          doc.text(text, col.x + 3, y + (ROW_H - 9) / 2, { width: col.w - 6, align });
        });

        // Professeur cell — name, then a blank line left for the actual
        // handwritten/stamped signature on the printed document.
        const profCol = cols.professeur;
        doc.fillColor(BLACK).fontSize(8).font('Helvetica')
          .text(row.instructorName || '-', profCol.x + 3, y + 5, { width: profCol.w - 6, align: 'center' });
        doc.moveTo(profCol.x + 8, y + ROW_H - 13).lineTo(profCol.x + profCol.w - 8, y + ROW_H - 13)
          .lineWidth(0.5).strokeColor('#9ca3af').stroke();
        doc.fillColor(GRAY).fontSize(6).font('Helvetica-Oblique')
          .text('Signature', profCol.x + 3, y + ROW_H - 10, { width: profCol.w - 6, align: 'center' });

        // Appréciation cell
        const apprCol = cols.appreciation;
        doc.fillColor(BLACK).fontSize(9).font('Helvetica-Bold')
          .text(row.appreciation || '', apprCol.x + 3, y + (ROW_H - 9) / 2, { width: apprCol.w - 6, align: 'left' });

        // Row bottom border
        doc.moveTo(LEFT, y + ROW_H).lineTo(LEFT + PAGE_W, y + ROW_H).lineWidth(0.3).strokeColor('#d1d5db').stroke();

        y += ROW_H;
      });

      // MOYENNE GÉNÉRALE row
      doc.rect(LEFT, y, PAGE_W, HEADER_ROW_H).fill(NAVY);
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

      // Label spans first 5 columns
      const mgLabelWidth = cols.compos.x + cols.compos.w - LEFT;
      doc.text('MOYENNE GÉNÉRALE', LEFT + 3, y + 7, { width: mgLabelWidth - 6, align: 'center' });

      // Value in moyenne column
      const mgText = moyenneGenerale !== null && moyenneGenerale !== undefined ? String(moyenneGenerale) : '-';
      doc.text(mgText, cols.moyenne.x + 3, y + 7, { width: cols.moyenne.w - 6, align: 'center' });

      // Overall appreciation in the appréciation column of the summary row
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text(getAppreciation(moyenneGenerale), cols.appreciation.x + 3, y + 7, { width: cols.appreciation.w - 6, align: 'left' });

      // Outer border around the whole table
      const tableHeight = HEADER_ROW_H + bulletin.length * ROW_H + HEADER_ROW_H;
      doc.rect(LEFT, TABLE_TOP, PAGE_W, tableHeight).lineWidth(1).strokeColor(NAVY).stroke();

      // Vertical lines
      ['interro1', 'interro2', 'devoir', 'compos', 'moyenne', 'professeur', 'appreciation'].forEach(key => {
        const col = cols[key];
        doc.moveTo(col.x, TABLE_TOP).lineTo(col.x, TABLE_TOP + tableHeight).lineWidth(0.5).strokeColor('#9ca3af').stroke();
      });

      // ── Footer ────────────────────────────────────────────────────────────────
      // 20px above the bottom margin — not right at it, or pdfkit's own
      // page-overflow check silently pushes this text onto a blank page 2.
      const footerY = doc.page.height - doc.page.margins.bottom - 20;
      doc.moveTo(LEFT, footerY - 8).lineTo(LEFT + PAGE_W, footerY - 8).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      doc.fillColor(GRAY).fontSize(9).font('Helvetica')
        .text(
          school?.name ? `${school.name} — Document généré électroniquement` : 'Document généré électroniquement',
          LEFT, footerY, { align: 'center', width: PAGE_W }
        );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateBulletinPDF };
