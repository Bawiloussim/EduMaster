const request = require('supertest');
const ExcelJS = require('exceljs');
const testDb = require('./utils/testDb');
const { createUser, getAuthToken } = require('./utils/factories');
const User = require('../models/User');
const Course = require('../models/Course');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

function csv(rows) {
  return Buffer.from(rows.join('\n'));
}

async function xlsx(headerRow, dataRows) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Sheet1');
  sheet.addRow(headerRow);
  dataRows.forEach((r) => sheet.addRow(r));
  return wb.xlsx.writeBuffer();
}

describe('POST /api/admin/import/instructors', () => {
  test('crée un formateur sans classe/serie', async () => {
    const admin = await createUser({ role: 'admin' });
    const file = csv(['nom,email', 'Jean Prof,jean.prof@example.com']);

    const res = await request(app).post('/api/admin/import/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'formateurs.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    const user = await User.findOne({ email: 'jean.prof@example.com' });
    expect(user.role).toBe('instructor');
    expect(user.classe).toBeNull();
  });

  test('combine prenom et nom, et importe telephone/genre', async () => {
    const admin = await createUser({ role: 'admin' });
    const file = csv(['nom,prenom,email,telephone,genre', 'Fotso,Marie,marie.fotso@example.com,690000000,F']);

    const res = await request(app).post('/api/admin/import/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'formateurs.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    const user = await User.findOne({ email: 'marie.fotso@example.com' });
    expect(user.name).toBe('Marie Fotso');
    expect(user.phone).toBe('690000000');
    expect(user.gender).toBe('F');
  });

  test('rejette un email déjà utilisé', async () => {
    const admin = await createUser({ role: 'admin' });
    await createUser({ email: 'existe.deja@example.com' });
    const file = csv(['nom,email', 'Doublon,existe.deja@example.com']);

    const res = await request(app).post('/api/admin/import/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'formateurs.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(0);
    expect(res.body.data.errors[0].reason).toBe('Compte déjà existant');
  });

  test('accepte un fichier Excel (.xlsx)', async () => {
    const admin = await createUser({ role: 'admin' });
    const buffer = await xlsx(['nom', 'prenom', 'email'], [['Durand', 'Paul', 'paul.durand@example.com']]);

    const res = await request(app).post('/api/admin/import/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', buffer, 'formateurs.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
  });
});

describe('POST /api/admin/import/students', () => {
  test('refuse une classe qui n\'existe pas encore pour l\'établissement', async () => {
    const admin = await createUser({ role: 'admin' });
    const file = csv(['nom,email,classe', 'Alice,alice@example.com,6ème']);

    const res = await request(app).post('/api/admin/import/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'eleves.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(0);
    expect(res.body.data.errors[0].reason).toBe("Cette classe n'existe pas encore pour votre établissement");
  });

  test('crée un élève avec matricule/telephone/genre/date_naissance quand la classe existe', async () => {
    const admin = await createUser({ role: 'admin' });
    await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    const file = csv([
      'nom,prenom,email,classe,matricule,telephone,genre,date_naissance',
      'Ngono,Paul,paul.ngono@example.com,6ème,M001,691111111,M,2012-03-15',
    ]);
    const res = await request(app).post('/api/admin/import/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'eleves.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    const user = await User.findOne({ email: 'paul.ngono@example.com' });
    expect(user.name).toBe('Paul Ngono');
    expect(user.matricule).toBe('M001');
    expect(user.phone).toBe('691111111');
    expect(user.gender).toBe('M');
    expect(user.birthDate.toISOString().slice(0, 10)).toBe('2012-03-15');
  });

  test('utilise le mot_de_passe fourni au lieu d\'en générer un', async () => {
    const admin = await createUser({ role: 'admin' });
    await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    const file = csv(['nom,email,classe,mot_de_passe', 'Bella,bella@example.com,6ème,MonMotDePasse1']);
    const res = await request(app).post('/api/admin/import/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'eleves.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.created[0].tempPassword).toBe('MonMotDePasse1');
  });

  test('accepte un fichier Excel (.xlsx) et gère une date native', async () => {
    const admin = await createUser({ role: 'admin' });
    await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    const buffer = await xlsx(['nom', 'email', 'classe'], [['Excel Eleve', 'excel.eleve@example.com', '6ème']]);
    const res = await request(app).post('/api/admin/import/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', buffer, 'eleves.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
  });
});

describe('POST /api/admin/import/courses', () => {
  test('crée un cours en brouillon avec le formateur résolu par email', async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', name: 'Prof Test', email: 'prof.test@example.com', school: admin.school });
    const file = csv(['matiere,classe,serie,email_formateur', `Maths,Terminale,D,${instructor.email}`]);

    const res = await request(app).post('/api/admin/import/courses')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'cours.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    const course = await Course.findOne({ title: 'Maths' });
    expect(course.status).toBe('draft');
    expect(course.instructor.toString()).toBe(instructor._id.toString());
  });

  test('rejette une ligne dont le formateur est introuvable', async () => {
    const admin = await createUser({ role: 'admin' });
    const file = csv(['matiere,classe,serie,email_formateur', 'Maths,Terminale,D,inconnu@example.com']);

    const res = await request(app).post('/api/admin/import/courses')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'cours.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(0);
    expect(res.body.data.errors[0].reason).toBe('Formateur introuvable');
  });

  test('accepte un cours de collège sans serie et rejette un cours de lycée sans serie', async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', email: 'prof2@example.com', school: admin.school });
    const file = csv([
      'matiere,classe,serie,email_formateur',
      `Français,6ème,,${instructor.email}`,
      `Physique,Première,,${instructor.email}`,
    ]);

    const res = await request(app).post('/api/admin/import/courses')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'cours.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.created[0].classe).toBe('6ème');
    expect(res.body.data.errors[0].reason).toBe('Série invalide');
  });

  test('un admin peut aussi être référencé comme formateur', async () => {
    const admin = await createUser({ role: 'admin', email: 'admin.prof@example.com' });
    const file = csv(['matiere,classe,serie,email_formateur', `SVT,3ème,,${admin.email}`]);

    const res = await request(app).post('/api/admin/import/courses')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'cours.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
  });
});
