const request = require('supertest');
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
