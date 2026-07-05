const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const User = require('../models/User');

// Generate a course-completion attestation (no exam required)
exports.generateCompletion = async (studentId, course) => {
  const existing = await Certificate.findOne({ student: studentId, course: course._id, type: 'completion' });
  if (existing) return existing;

  const student = await User.findById(studentId);
  if (!student) throw new Error('Étudiant introuvable');

  const uniqueId = uuidv4();
  const verifyHash = crypto.createHash('sha256').update(uniqueId).digest('hex');
  const verifyUrl = `${process.env.CLIENT_URL}/certificates/verify/${verifyHash}`;

  const pdfBuffer = await generateCompletionPDF(student.name, course.title, course.subject, new Date(), uniqueId, verifyUrl);

  let pdfUrl = '';
  try {
    const { cloudinary } = require('../middlewares/upload');
    if (process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
      const b64 = pdfBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${b64}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: 'edumaster/attestations',
        resource_type: 'raw',
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
  if (existing) return existing;

  const student = await User.findById(result.student);
  if (!student) throw new Error('Étudiant introuvable');

  const uniqueId = uuidv4();
  const verifyHash = crypto.createHash('sha256').update(uniqueId).digest('hex');
  const verifyUrl = `${process.env.CLIENT_URL}/certificates/verify/${verifyHash}`;

  const pdfBuffer = await generatePDF(student.name, course.title, exam.title, result.score, new Date(), uniqueId, verifyUrl);

  let pdfUrl = '';
  try {
    const { cloudinary } = require('../middlewares/upload');
    if (process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
      const b64 = pdfBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${b64}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: 'edumaster/certificates',
        resource_type: 'raw',
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

function generateCompletionPDF(studentName, courseTitle, subject, date, certId, verifyUrl) {
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

      doc.rect(0, 0, W, H).fill('#f0f7ff');
      doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke('#003580');
      doc.rect(30, 30, W - 60, H - 60).lineWidth(1).stroke('#0ea5e9');

      doc.fillColor('#003580').fontSize(40).font('Helvetica-Bold')
        .text('ATTESTATION DE RÉUSSITE', 0, 80, { align: 'center' });

      doc.fillColor('#0ea5e9').fontSize(15).font('Helvetica')
        .text('EduMaster — Plateforme d\'apprentissage en ligne', 0, 133, { align: 'center' });

      doc.moveTo(100, 163).lineTo(W - 100, 163).lineWidth(1).stroke('#d1d5db');

      doc.fillColor('#374151').fontSize(17).font('Helvetica')
        .text('Cette attestation certifie que', 0, 183, { align: 'center' });

      doc.fillColor('#003580').fontSize(30).font('Helvetica-Bold')
        .text(studentName, 0, 213, { align: 'center' });

      doc.fillColor('#374151').fontSize(17).font('Helvetica')
        .text('a complété avec succès le cours', 0, 258, { align: 'center' });

      doc.fillColor('#111827').fontSize(23).font('Helvetica-Bold')
        .text(`"${courseTitle}"`, 0, 286, { align: 'center' });

      if (subject && subject !== courseTitle) {
        doc.fillColor('#0ea5e9').fontSize(14).font('Helvetica')
          .text(`Matière : ${subject}`, 0, 320, { align: 'center' });
      }

      doc.fillColor('#374151').fontSize(13).font('Helvetica')
        .text(`Délivrée le : ${date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`, 0, 348, { align: 'center' });

      doc.fillColor('#6b7280').fontSize(9)
        .text(`ID : ${certId}`, 0, H - 78, { align: 'center' });

      doc.image(qrBuffer, W - 138, H - 138, { width: 100 });

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
