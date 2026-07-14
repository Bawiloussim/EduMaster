const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, createSchool, getAuthToken } = require('./utils/factories');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('POST /api/auth/register', () => {
  test('crée un compte student par défaut', async () => {
    const school = await createSchool();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice', email: 'alice@example.com', password: 'Test1234!', schoolId: school._id,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
    expect(res.body.accessToken).toBeDefined();
  });

  test('un chef d\'établissement s\'inscrit sans école et reçoit une session immédiatement', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mallory', email: 'mallory@example.com', password: 'Test1234!', role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();

    const created = await require('../models/User').findOne({ email: 'mallory@example.com' });
    expect(created.school).toBeNull();
    expect(created.status).toBe('active');
  });

  test('refuse un chef d\'établissement qui tente de rejoindre un établissement existant', async () => {
    const school = await createSchool();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mallory', email: 'mallory2@example.com', password: 'Test1234!', role: 'admin', schoolId: school._id,
    });
    expect(res.status).toBe(422);
  });

  test('refuse un établissement invalide ou manquant', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'NoSchool', email: 'noschool@example.com', password: 'Test1234!',
    });
    expect(res.status).toBe(422);
  });

  test('refuse un email déjà utilisé', async () => {
    const school = await createSchool();
    await createUser({ email: 'dup@example.com', school: school._id });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup', email: 'dup@example.com', password: 'Test1234!', schoolId: school._id,
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('connecte avec les bons identifiants', async () => {
    const school = await createSchool();
    await request(app).post('/api/auth/register').send({
      name: 'Bob', email: 'bob@example.com', password: 'Test1234!', schoolId: school._id,
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com', password: 'Test1234!',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('refuse un mauvais mot de passe', async () => {
    const school = await createSchool();
    await request(app).post('/api/auth/register').send({
      name: 'Carl', email: 'carl@example.com', password: 'Test1234!', schoolId: school._id,
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'carl@example.com', password: 'wrong',
    });
    expect(res.status).toBe(401);
  });

  test('un chef d\'établissement peut se connecter sans avoir vérifié son email', async () => {
    const user = await createUser({ role: 'admin', school: null, status: 'active', emailVerified: false, password: 'Test1234!' });
    const res = await request(app).post('/api/auth/login').send({
      email: user.email, password: 'Test1234!',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});

describe('POST /api/auth/resend-verification', () => {
  test('régénère le token de vérification pour un compte non vérifié', async () => {
    const user = await createUser({ role: 'admin', school: null, emailVerified: false });
    const res = await request(app).post('/api/auth/resend-verification').send({ email: user.email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await require('../models/User').findOne({ email: user.email }).select('+emailVerificationToken');
    expect(updated.emailVerificationToken).toBeDefined();
  });

  test('répond de façon générique pour un email inconnu (anti-énumération)', async () => {
    const res = await request(app).post('/api/auth/resend-verification').send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PATCH /api/auth/me/classe', () => {
  test('accepte une classe de lycée avec sa série', async () => {
    const user = await createUser({ role: 'student' });
    const res = await request(app).patch('/api/auth/me/classe')
      .set('Authorization', `Bearer ${getAuthToken(user)}`)
      .send({ classe: 'Terminale', serie: 'D' });
    expect(res.status).toBe(200);
    expect(res.body.data.classe).toBe('Terminale');
    expect(res.body.data.serie).toBe('D');
  });

  test('refuse une classe de lycée sans série', async () => {
    const user = await createUser({ role: 'student' });
    const res = await request(app).patch('/api/auth/me/classe')
      .set('Authorization', `Bearer ${getAuthToken(user)}`)
      .send({ classe: 'Terminale' });
    expect(res.status).toBe(422);
  });

  test('accepte une classe de collège sans série', async () => {
    const user = await createUser({ role: 'student' });
    const res = await request(app).patch('/api/auth/me/classe')
      .set('Authorization', `Bearer ${getAuthToken(user)}`)
      .send({ classe: '6ème' });
    expect(res.status).toBe(200);
    expect(res.body.data.classe).toBe('6ème');
    expect(res.body.data.serie).toBeNull();
  });
});
