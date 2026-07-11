const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, getAuthToken } = require('./utils/factories');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('POST /api/auth/register', () => {
  test('crée un compte student par défaut', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice', email: 'alice@example.com', password: 'Test1234!',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
    expect(res.body.accessToken).toBeDefined();
  });

  test('ignore un rôle admin demandé à l\'inscription', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mallory', email: 'mallory@example.com', password: 'Test1234!', role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
  });

  test('refuse un email déjà utilisé', async () => {
    await createUser({ email: 'dup@example.com' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup', email: 'dup@example.com', password: 'Test1234!',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('connecte avec les bons identifiants', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob', email: 'bob@example.com', password: 'Test1234!',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com', password: 'Test1234!',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('refuse un mauvais mot de passe', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Carl', email: 'carl@example.com', password: 'Test1234!',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'carl@example.com', password: 'wrong',
    });
    expect(res.status).toBe(401);
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
