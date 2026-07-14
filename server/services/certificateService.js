const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');
const School = require('../models/School');
const { loadImageBuffer } = require('../utils/pdfImage');

// Generate a course-completion attestation (no exam required)
exports.generateCompletion = async (studentId, course) => {
  const existing = await Certificate.findOne({ student: studentId, course: course._id, type: 'completion' });

  const student = await User.findById(studentId);
  if (!student) throw new Error('Étudiant introuvable');

  const enrollment = await Enrollment.findOne({ student: studentId, course: course._id }).lean();
  const completedLessons = enrollment?.completedLessons || [];
  const lessons = completedLessons.length
    ? await Lesson.find({ _id: { $in: completedLessons } }).sort({ order: 1 }).select('title').lean()
    : [];
  const lessonTitles = lessons.map((l) => l.title);

  const instructorId = course.instructor?._id || course.instructor;
  const instructor = instructorId ? await User.findById(instructorId).select('name email').lean() : null;

  const schoolId = course.school?._id || course.school;
  const school = schoolId ? await School.findById(schoolId).select('name logo').lean() : null;

  // The DB record (and any Cloudinary upload) only needs to happen once, but the
  // PDF bytes must be rebuilt on every call — the caller always needs them to
  // stream back a download, whether or not a Certificate row already exists.
  const uniqueId = existing?.uniqueId || uuidv4();
  const verifyHash = existing?.verifyHash || crypto.createHash('sha256').update(uniqueId).digest('hex');
  const verifyUrl = `${process.env.CLIENT_URL}/certificates/verify/${verifyHash}`;

  const pdfBuffer = await generateCompletionPDF({
    studentName: student.name, courseTitle: course.title, subject: course.subject,
    classe: course.classe, serie: course.serie, lessonTitles, instructor, school,
    date: existing?.issuedAt || new Date(), certId: uniqueId, verifyUrl,
  });

  if (existing) {
    existing._pdfBuffer = pdfBuffer;
    return existing;
  }

  let pdfUrl = '';
  try {
    const { cloudinary } = require('../middlewares/upload');
    if (process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
      const b64 = pdfBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${b64}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: 'edumaster/attestations',
        // 'image' (not 'raw') — Cloudinary blocks public delivery of raw PDFs by
        // default; see middlewares/upload.js for the same fix on lesson PDFs.
        resource_type: 'image',
        public_id: `attestation_${uniqueId}`,
      });
      pdfUrl = uploaded.secure_url;
    }
  } catch {}

  const cert = await Certificate.create({
    student: studentId,
    course: course._id,
    type: 'completion',
    uniqueId,
    verifyHash,
    pdfUrl,
  });
  cert._pdfBuffer = pdfBuffer;
  return cert;
};

exports.generate = async (userRef, course, exam, result) => {
  const existing = await Certificate.findOne({ student: result.student, exam: exam._id });

  const student = await User.findById(result.student);
  if (!student) throw new Error('Étudiant introuvable');

  const uniqueId = existing?.uniqueId || uuidv4();
  const verifyHash = existing?.verifyHash || crypto.createHash('sha256').update(uniqueId).digest('hex');
  const verifyUrl = `${process.env.CLIENT_URL}/certificates/verify/${verifyHash}`;

  const pdfBuffer = await generatePDF(student.name, course.title, exam.title, result.score, existing?.issuedAt || new Date(), uniqueId, verifyUrl);

  if (existing) {
    existing._pdfBuffer = pdfBuffer;
    return existing;
  }

  let pdfUrl = '';
  try {
    const { cloudinary } = require('../middlewares/upload');
    if (process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
      const b64 = pdfBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${b64}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: 'edumaster/certificates',
        // 'image' (not 'raw') — Cloudinary blocks public delivery of raw PDFs by
        // default; see middlewares/upload.js for the same fix on lesson PDFs.
        resource_type: 'image',
        public_id: `cert_${uniqueId}`,
      });
      pdfUrl = uploaded.secure_url;
    }
  } catch {}

  const cert = await Certificate.create({
    student: result.student,
    course: course._id,
    exam: exam._id,
    result: result._id,
    uniqueId,
    verifyHash,
    pdfUrl,
  });

  cert._pdfBuffer = pdfBuffer;
  return cert;
};

function generateCompletionPDF({ studentName, courseTitle, subject, classe, serie, lessonTitles, instructor, school, date, certId, verifyUrl }) {
  return new Promise(async (resolve, reject) => {
    try {
      const [qrBuffer, logoBuffer] = await Promise.all([
        QRCode.toBuffer(verifyUrl, { width: 90, margin: 1 }),
        loadImageBuffer(school?.logo),
      ]);
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      const INK = '#1f2937';
      const GRAY = '#6b7280';
      const GOLD = '#c9a227';
      const GOLD_LIGHT = '#e3c567';
      const TEAL = '#0f766e';
      const MAROON = '#7a1f3d';

      // ── Background + corner decorations ────────────────────────────────────
      doc.rect(0, 0, W, H).fill('#fffdf8');

      // Top-left ribbon: dark base, gold band, thin teal edge
      doc.polygon([0, 0], [W * 0.30, 0], [0, H * 0.42]).fill('#1c1c1c');
      doc.polygon([0, 0], [W * 0.22, 0], [0, H * 0.30]).fill(GOLD);
      doc.polygon([0, 0], [W * 0.13, 0], [0, H * 0.17]).fill(TEAL);

      // Top-right ribbon: maroon base with a gold edge
      doc.polygon([W, 0], [W - W * 0.26, 0], [W, H * 0.36]).fill(MAROON);
      doc.polygon([W, 0], [W - W * 0.10, 0], [W, H * 0.14]).fill(GOLD_LIGHT);

      // Gold seal badge, sitting over the maroon corner
      const sealCx = W - 95, sealCy = 78;
      doc.circle(sealCx, sealCy, 46).fill(GOLD);
      doc.circle(sealCx, sealCy, 37).fill('#fffdf8');
      doc.circle(sealCx, sealCy, 30).fill(GOLD);
      doc.fillColor('#fffdf8').fontSize(7).font('Helvetica-Bold')
        .text('• • •', sealCx - 30, sealCy - 20, { width: 60, align: 'center' });
      doc.fontSize(9).text('CERTIFIÉ', sealCx - 30, sealCy - 8, { width: 60, align: 'center' });
      doc.fontSize(8).text('ORIGINAL', sealCx - 30, sealCy + 4, { width: 60, align: 'center' });

      // ── School identity ─────────────────────────────────────────────────────
      let headY = 44;
      if (logoBuffer) {
        try { doc.image(logoBuffer, W / 2 - 24, headY, { width: 48, height: 48, fit: [48, 48] }); } catch { /* skip corrupt image */ }
        headY += 54;
      }
      doc.fillColor(INK).fontSize(14).font('Helvetica-Bold')
        .text(school?.name || 'Établissement', 0, headY, { align: 'center', width: W });
      headY += 30;

      // ── Title ────────────────────────────────────────────────────────────────
      doc.fillColor(INK).fontSize(38).font('Helvetica-Bold')
        .text('ATTESTATION', 0, headY, { align: 'center', width: W, characterSpacing: 3 });
      headY = doc.y;
      doc.fillColor(GOLD).fontSize(16).font('Helvetica-Bold')
        .text('DE RÉUSSITE', 0, headY, { align: 'center', width: W, characterSpacing: 4 });
      headY = doc.y + 18;

      doc.fillColor(GRAY).fontSize(11).font('Helvetica-Bold')
        .text('CETTE ATTESTATION EST FIÈREMENT DÉCERNÉE À :', 0, headY, { align: 'center', width: W, characterSpacing: 1 });
      headY = doc.y + 14;

      // ── Student name ─────────────────────────────────────────────────────────
      doc.fillColor(MAROON).fontSize(32).font('Times-BoldItalic')
        .text(studentName, 0, headY, { align: 'center', width: W });
      headY = doc.y + 4;
      doc.moveTo(W / 2 - 160, headY).lineTo(W / 2 + 160, headY).lineWidth(1).strokeColor(GOLD).stroke();
      headY += 14;

      // ── Description ──────────────────────────────────────────────────────────
      doc.fillColor(INK).fontSize(13).font('Helvetica')
        .text('A complété avec succès le cours', 0, headY, { align: 'center', width: W });
      headY = doc.y + 2;
      doc.fillColor(INK).fontSize(15).font('Helvetica-Bold')
        .text(`« ${courseTitle} »`, 0, headY, { align: 'center', width: W });
      headY = doc.y + 6;

      const details = [subject && subject !== courseTitle ? subject : null, classe ? `${classe}${serie ? ' — Série ' + serie : ''}` : null]
        .filter(Boolean).join('  •  ');
      if (details) {
        doc.fillColor(TEAL).fontSize(11).font('Helvetica-Bold')
          .text(details, 0, headY, { align: 'center', width: W });
        headY = doc.y + 4;
      }
      if (lessonTitles.length) {
        doc.fillColor(GRAY).fontSize(10).font('Helvetica')
          .text(`${lessonTitles.length} leçon(s) complétée(s)`, 0, headY, { align: 'center', width: W });
        headY = doc.y + 4;
      }
      doc.fillColor(GRAY).fontSize(10).font('Helvetica')
        .text(`Délivrée le ${date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`, 0, headY, { align: 'center', width: W });

      if (instructor) {
        doc.fillColor(GRAY).fontSize(9).font('Helvetica-Oblique')
          .text(`Formateur : ${instructor.name}`, 0, doc.y + 8, { align: 'center', width: W });
      }

      // ── Footer: QR + certificate id (bottom-left) ────────────────────────────
      const qrX = 55, qrY = H - 118;
      doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold')
        .text('IDENTIFIANT DE CERTIFICAT VALIDE', qrX - 5, qrY - 16, { width: 130 });
      doc.image(qrBuffer, qrX, qrY, { width: 90 });
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
        .text(certId, qrX - 5, qrY + 94, { width: 130 });

      doc.end();
    } catch (e) { reject(e); }
  });
}

function generatePDF(studentName, courseTitle, examTitle, score, date, certId, verifyUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 100 });
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      // Background
      doc.rect(0, 0, W, H).fill('#f8f6f0');

      // Border
      doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke('#1e40af');
      doc.rect(30, 30, W - 60, H - 60).lineWidth(1).stroke('#93c5fd');

      // Title
      doc.fillColor('#1e40af').fontSize(42).font('Helvetica-Bold')
        .text('CERTIFICAT DE RÉUSSITE', 0, 80, { align: 'center' });

      // Subtitle
      doc.fillColor('#374151').fontSize(16).font('Helvetica')
        .text('EduMaster — Plateforme d\'apprentissage en ligne', 0, 135, { align: 'center' });

      // Divider
      doc.moveTo(100, 165).lineTo(W - 100, 165).lineWidth(1).stroke('#d1d5db');

      // Body
      doc.fillColor('#374151').fontSize(18).font('Helvetica')
        .text('Ce certificat atteste que', 0, 185, { align: 'center' });

      doc.fillColor('#1e40af').fontSize(30).font('Helvetica-Bold')
        .text(studentName, 0, 215, { align: 'center' });

      doc.fillColor('#374151').fontSize(18).font('Helvetica')
        .text('a réussi avec succès le cours', 0, 260, { align: 'center' });

      doc.fillColor('#111827').fontSize(24).font('Helvetica-Bold')
        .text(`"${courseTitle}"`, 0, 290, { align: 'center' });

      doc.fillColor('#374151').fontSize(14).font('Helvetica')
        .text(`Examen : ${examTitle}  |  Score obtenu : ${score}%`, 0, 330, { align: 'center' })
        .text(`Délivré le : ${date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`, 0, 355, { align: 'center' });

      // Certificate ID
      doc.fillColor('#6b7280').fontSize(10)
        .text(`ID : ${certId}`, 0, H - 80, { align: 'center' });

      // QR Code
      doc.image(qrBuffer, W - 140, H - 140, { width: 100 });

      doc.end();
    } catch (e) { reject(e); }
  });
}
