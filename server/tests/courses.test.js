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

describe('POST /api/courses', () => {
  test('un cours de collège reçoit serie: null (pas de défaut D)', async () => {
    const instructor = await createUser({ role: 'instructor' });
    const res = await request(app).post('/api/courses')
      .set('Authorization', `Bearer ${getAuthToken(instructor)}`)
      .send({ title: 'Français', subject: 'Français', classe: '4ème' });

    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('4ème');
    expect(res.body.data.serie).toBeNull();
  });

  test('un cours de lycée sans serie fournie reçoit le défaut D', async () => {
    const instructor = await createUser({ role: 'instructor' });
    const res = await request(app).post('/api/courses')
      .set('Authorization', `Bearer ${getAuthToken(instructor)}`)
      .send({ title: 'Physique', subject: 'Physique', classe: 'Première' });

    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('Première');
    expect(res.body.data.serie).toBe('D');
  });

  test('un cours de lycée avec serie explicite la respecte', async () => {
    const instructor = await createUser({ role: 'instructor' });
    const res = await request(app).post('/api/courses')
      .set('Authorization', `Bearer ${getAuthToken(instructor)}`)
      .send({ title: 'Philosophie', subject: 'Philosophie', classe: 'Terminale', serie: 'A4' });

    expect(res.status).toBe(201);
    expect(res.body.data.serie).toBe('A4');
  });

  test('refuse la création sans authentification', async () => {
    const res = await request(app).post('/api/courses').send({ title: 'X', subject: 'X', classe: 'Seconde' });
    expect(res.status).toBe(401);
  });
});
