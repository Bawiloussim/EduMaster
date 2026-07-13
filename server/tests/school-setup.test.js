const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, createCourse, getAuthToken } = require('./utils/factories');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('Auto-service établissement (chef d\'établissement)', () => {
  test('GET /schools/me renvoie null tant qu\'aucune école n\'est créée', async () => {
    const admin = await createUser({ role: 'admin', school: null });
    const res = await request(app).get('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('POST /schools/me crée l\'école et la lie au compte', async () => {
    const admin = await createUser({ role: 'admin', school: null });
    const res = await request(app).post('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Lycée Nouveau', city: 'Yaoundé', address: '12 rue X', phone: '690000000', email: 'contact@lycee.cm', currency: 'XAF' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Lycée Nouveau');

    const User = require('../models/User');
    const updated = await User.findById(admin._id);
    expect(updated.school.toString()).toBe(res.body.data._id);
  });

  test('POST /schools/me refuse si l\'admin a déjà une école', async () => {
    const admin = await createUser({ role: 'admin', school: null });
    await request(app).post('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Première école' });

    const res = await request(app).post('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Deuxième école' });
    expect(res.status).toBe(409);
  });

  test('PATCH /schools/me met à jour les champs de l\'école', async () => {
    const admin = await createUser({ role: 'admin', school: null });
    const createRes = await request(app).post('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'École à modifier' });

    const res = await request(app).patch('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ academicYearLabel: '2026-2027', currency: 'EUR' });
    expect(res.status).toBe(200);
    expect(res.body.data.academicYearLabel).toBe('2026-2027');
    expect(res.body.data.currency).toBe('EUR');
    expect(res.body.data.name).toBe('École à modifier');
  });

  test('GET /schools/me/setup-status renvoie des comptages en direct', async () => {
    const admin = await createUser({ role: 'admin', school: null });
    const createRes = await request(app).post('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'École stats' });
    const schoolId = createRes.body.data._id;

    const instructor = await createUser({ role: 'instructor', school: schoolId });
    await createUser({ role: 'student', school: schoolId });
    await createCourse({ school: schoolId, instructor: instructor._id });

    const res = await request(app).get('/api/schools/me/setup-status')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.hasSchool).toBe(true);
    expect(res.body.data.teachersCount).toBe(1);
    expect(res.body.data.studentsCount).toBe(1);
    expect(res.body.data.coursesCount).toBe(1);
  });

  test('un élève ne peut pas accéder aux endpoints self-service école', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app).get('/api/schools/me')
      .set('Authorization', `Bearer ${getAuthToken(student)}`);
    expect(res.status).toBe(403);
  });
});
