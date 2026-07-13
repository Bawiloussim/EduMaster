const request = require('supertest');
const ExcelJS = require('exceljs');
const testDb = require('./utils/testDb');
const { createUser, getAuthToken } = require('./utils/factories');
const User = require('../models/User');
const Course = require('../models/Course');
const Class = require('../models/Class');

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

describe('POST /api/admin/import/students — classe non créée', () => {
  test("rejette une ligne dont la classe n'existe pas encore pour l'établissement", async () => {
    const admin = await createUser({ role: 'admin' });
    const file = csv(['nom,email,classe', 'Test Eleve,eleve.classe.inexistante@example.com,6ème']);

    const res = await request(app).post('/api/admin/import/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', file, 'eleves.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(0);
    expect(res.body.data.errors[0].reason).toBe("Cette classe n'existe pas encore pour votre établissement");
  });
});

describe('POST /api/admin/import/students — fichier Excel (.xlsx)', () => {
  test('importe des élèves avec les nouvelles colonnes (prenom, matricule, telephone, genre, date_naissance)', async () => {
    const admin = await createUser({ role: 'admin' });
    await Class.create({ school: admin.school, classe: 'Terminale', serie: 'D' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Eleves');
    ws.addRow(['Nom', 'Prenom', 'Email', 'Classe', 'Serie', 'Matricule', 'Telephone', 'Genre', 'Date_naissance']);
    ws.addRow(['Kamga', 'Alice', 'alice.kamga.xlsx@example.com', 'Terminale', 'D', 'MAT001', '699000000', 'F', '2006-05-12']);
    const buffer = await wb.xlsx.writeBuffer();

    const res = await request(app).post('/api/admin/import/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .attach('file', Buffer.from(buffer), 'eleves.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.created[0].name).toBe('Alice Kamga');

    const user = await User.findOne({ email: 'alice.kamga.xlsx@example.com' });
    expect(user.matricule).toBe('MAT001');
    expect(user.phone).toBe('699000000');
    expect(user.gender).toBe('F');
    expect(user.classe).toBe('Terminale');
    expect(user.serie).toBe('D');
  });
});

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
