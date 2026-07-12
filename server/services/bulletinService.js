const PDFDocument = require('pdfkit');
const { getAppreciation } = require('../utils/appreciation');

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
 * @returns {Promise<Buffer>}
 */
function generateBulletinPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const { trimestre, bulletin, moyenneGenerale, studentName } = data;
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

      // ── Header ────────────────────────────────────────────────────────────────
      doc.fillColor(NAVY).fontSize(24).font('Helvetica-Bold')
        .text('EduMaster', LEFT, 40, { continued: false });

      doc.fillColor(NAVY).fontSize(16).font('Helvetica-Bold')
        .text('BULLETIN SCOLAIRE', LEFT, 70, { align: 'center', width: PAGE_W });

      doc.fillColor(GRAY).fontSize(11).font('Helvetica')
        .text(`Trimestre : ${trimestre}`, LEFT, 95, { align: 'center', width: PAGE_W });

      doc.fillColor(BLACK).fontSize(12).font('Helvetica-Bold')
        .text(`Élève : ${studentName || 'N/A'}`, LEFT, 115, { align: 'center', width: PAGE_W });

      doc.fillColor(GRAY).fontSize(10).font('Helvetica')
        .text(
          `Généré le : ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          LEFT, 132, { align: 'center', width: PAGE_W }
        );

      // Separator line
      doc.moveTo(LEFT, 150).lineTo(LEFT + PAGE_W, 150).lineWidth(1.5).strokeColor(NAVY).stroke();

      // ── Table ─────────────────────────────────────────────────────────────────
      const TABLE_TOP = 162;
      const HEADER_ROW_H = 22;
      const ROW_H = 34; // taller than the header — the appréciation cell stacks the formateur's name above the appréciation itself

      // Column widths (total = PAGE_W)
      const cols = {
        subject:      { x: LEFT,        w: 120 },
        interro1:     { x: LEFT + 120,  w: 52 },
        interro2:     { x: LEFT + 172,  w: 52 },
        devoir:       { x: LEFT + 224,  w: 52 },
        compos:       { x: LEFT + 276,  w: 52 },
        moyenne:      { x: LEFT + 328,  w: 60 },
        appreciation: { x: LEFT + 388,  w: PAGE_W - 348 },
      };

      // Header row
      doc.rect(LEFT, TABLE_TOP, PAGE_W, HEADER_ROW_H).fill(NAVY);
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

      const headers = [
        { key: 'subject',      label: 'Matière' },
        { key: 'interro1',     label: 'Interro 1' },
        { key: 'interro2',     label: 'Interro 2' },
        { key: 'devoir',       label: 'Devoir' },
        { key: 'compos',       label: 'Compos.' },
        { key: 'moyenne',      label: 'Moy./20' },
        { key: 'appreciation', label: 'Appréciation' },
      ];
      headers.forEach(({ key, label }) => {
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

        // Appréciation cell — formateur name (signature) above the appréciation itself
        const apprCol = cols.appreciation;
        doc.fillColor(GRAY).fontSize(7).font('Helvetica-Oblique')
          .text(row.instructorName ? `— ${row.instructorName}` : '', apprCol.x + 3, y + 5, { width: apprCol.w - 6, align: 'left' });
        doc.fillColor(BLACK).fontSize(9).font('Helvetica-Bold')
          .text(row.appreciation || '', apprCol.x + 3, y + 18, { width: apprCol.w - 6, align: 'left' });

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
      ['interro1', 'interro2', 'devoir', 'compos', 'moyenne', 'appreciation'].forEach(key => {
        const col = cols[key];
        doc.moveTo(col.x, TABLE_TOP).lineTo(col.x, TABLE_TOP + tableHeight).lineWidth(0.5).strokeColor('#9ca3af').stroke();
      });

      // ── Footer ────────────────────────────────────────────────────────────────
      const footerY = doc.page.height - 50;
      doc.moveTo(LEFT, footerY - 8).lineTo(LEFT + PAGE_W, footerY - 8).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      doc.fillColor(GRAY).fontSize(9).font('Helvetica')
        .text('Document généré automatiquement par EduMaster', LEFT, footerY, { align: 'center', width: PAGE_W });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateBulletinPDF };
