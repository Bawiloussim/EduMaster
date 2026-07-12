const request = require('supertest');
const testDb = require('./utils/testDb');
const { createSchool, createUser } = require('./utils/factories');
const User = require('../models/User');

let mockPayload;
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(async ({ idToken }) => {
      if (idToken === 'bad-token') throw new Error('invalid token');
      return { getPayload: () => mockPayload };
    }),
  })),
}));

let app;

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('POST /api/auth/google', () => {
  test('crée un compte élève, déjà vérifié, sans mot de passe', async () => {
    const school = await createSchool();
    mockPayload = { email: 'nouvel.eleve@gmail.com', email_verified: true, name: 'Nouvel Élève', sub: 'google-sub-1' };

    const res = await request(app).post('/api/auth/google').send({
      credential: 'good-token', role: 'student', schoolId: school._id, classe: 'Terminale', serie: 'D',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
    expect(res.body.accessToken).toBeDefined();

    const user = await User.findOne({ email: 'nouvel.eleve@gmail.com' }).select('+password');
    expect(user.googleId).toBe('google-sub-1');
    expect(user.emailVerified).toBe(true);
    expect(user.password).toBeUndefined();
  });

  test('refuse un email Google non vérifié', async () => {
    const school = await createSchool();
    mockPayload = { email: 'pasverifie@gmail.com', email_verified: false, name: 'X', sub: 'google-sub-2' };

    const res = await request(app).post('/api/auth/google').send({
      credential: 'good-token', role: 'student', schoolId: school._id, classe: 'Terminale', serie: 'D',
    });
    expect(res.status).toBe(422);
  });

  test('refuse un jeton invalide', async () => {
    const school = await createSchool();
    const res = await request(app).post('/api/auth/google').send({
      credential: 'bad-token', role: 'student', schoolId: school._id, classe: 'Terminale', serie: 'D',
    });
    expect(res.status).toBe(401);
  });

  test('exige un établissement pour un nouveau compte', async () => {
    mockPayload = { email: 'sansecole@gmail.com', email_verified: true, name: 'X', sub: 'google-sub-3' };
    const res = await request(app).post('/api/auth/google').send({ credential: 'good-token', role: 'student' });
    expect(res.status).toBe(422);
  });

  test('connecte un compte existant au lieu de le recréer', async () => {
    const school = await createSchool();
    const existing = await createUser({ email: 'deja.inscrit@gmail.com', school: school._id, role: 'student' });
    mockPayload = { email: 'deja.inscrit@gmail.com', email_verified: true, name: 'Déjà Inscrit', sub: 'google-sub-4' };

    const res = await request(app).post('/api/auth/google').send({ credential: 'good-token' });

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(existing._id.toString());
    expect(res.body.accessToken).toBeDefined();

    const updated = await User.findById(existing._id);
    expect(updated.googleId).toBe('google-sub-4');
  });

  test('un compte deux fois plus grand ne recrée pas un doublon (bug de l\'index sparse)', async () => {
    const school = await createSchool();
    await createUser({ school: school._id, role: 'student' });
    await createUser({ school: school._id, role: 'student' });
    const count = await User.countDocuments({});
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
