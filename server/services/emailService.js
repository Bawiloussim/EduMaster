const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

const send = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') return;
  const transporter = createTransporter();
  await transporter.sendMail({ from: `"EduMaster" <${process.env.EMAIL_USER}>`, to, subject, html });
};

exports.sendWelcome = (user) =>
  send(user.email, 'Bienvenue sur EduMaster !', `<p>Bonjour ${user.name},</p><p>Votre compte EduMaster a été créé avec succès.</p>`);

exports.sendPasswordReset = (user, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  return send(user.email, 'Réinitialisation de votre mot de passe', `<p>Bonjour ${user.name},</p><p>Cliquez <a href="${url}">ici</a> pour réinitialiser votre mot de passe. Ce lien expire dans 1 heure.</p>`);
};

exports.sendExamResult = (user, exam, score, passed) =>
  send(user.email, `Résultat : ${exam.title}`, `<p>Bonjour ${user.name},</p><p>Vous avez obtenu <strong>${score}%</strong> à l'examen "${exam.title}". Résultat : ${passed ? '✅ Réussi' : '❌ Échoué'}</p>`);

exports.sendCertificateReady = (user, course, verifyUrl) =>
  send(user.email, `Certificat disponible : ${course.title}`, `<p>Bonjour ${user.name},</p><p>Votre certificat pour le cours "${course.title}" est prêt. <a href="${verifyUrl}">Télécharger</a></p>`);

exports.sendNotification = (user, title, message) =>
  send(user.email, title, `<p>Bonjour ${user.name},</p><p>${message}</p>`);

exports.sendGradingNeeded = (instructor, { studentName, itemTitle, courseTitle, link }) =>
  send(instructor.email, `Copie à corriger : ${itemTitle}`,
    `<p>Bonjour ${instructor.name},</p><p><strong>${studentName}</strong> a envoyé sa copie pour "${itemTitle}" (${courseTitle}). <a href="${link}">Corriger maintenant</a></p>`);

exports.sendExerciseGraded = (student, statement, grade, feedback) =>
  send(student.email, 'Votre exercice a été corrigé',
    `<p>Bonjour ${student.name},</p><p>Votre réponse à l'exercice "${statement}" a été corrigée. Note : <strong>${grade}/10</strong>${feedback ? `<br/>Commentaire : ${feedback}` : ''}</p>`);

exports.sendGradeSigned = (student, { evalLabel, courseTitle, instructorName }) =>
  send(student.email, `Note disponible : ${evalLabel} — ${courseTitle}`,
    `<p>Bonjour ${student.name},</p><p>Votre note pour "${evalLabel}" (${courseTitle}) a été validée et signée par ${instructorName}. Consultez votre bulletin sur EduMaster.</p>`);

exports.sendStudentImported = (user, tempPassword) =>
  send(user.email, 'Votre compte EduMaster a été créé',
    `<p>Bonjour ${user.name},</p><p>Un compte EduMaster a été créé pour vous par votre établissement.</p><p>Email : <strong>${user.email}</strong><br/>Mot de passe temporaire : <strong>${tempPassword}</strong></p><p>Merci de vous connecter et de changer votre mot de passe dès que possible.</p>`);
