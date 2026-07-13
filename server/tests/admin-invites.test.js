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

describe('Invitation de co-administrateurs', () => {
  test('crée un nouveau chef d\'établissement actif dans la même école', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/admin/invites')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Co Admin', email: 'coadmin@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.tempPassword).toBeDefined();

    const User = require('../models/User');
    const created = await User.findOne({ email: 'coadmin@example.com' });
    expect(created.role).toBe('admin');
    expect(created.status).toBe('active');
    expect(created.emailVerified).toBe(true);
    expect(created.school.toString()).toBe(school._id.toString());
  });

  test('le compte invité peut se connecter directement, sans passer par l\'assistant', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const inviteRes = await request(app).post('/api/admin/invites')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Co Admin', email: 'coadmin2@example.com' });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'coadmin2@example.com', password: inviteRes.body.data.tempPassword,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.school._id).toBe(school._id.toString());
  });

  test('refuse un email déjà utilisé', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await createUser({ email: 'dup@example.com', school: school._id });

    const res = await request(app).post('/api/admin/invites')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Dup', email: 'dup@example.com' });
    expect(res.status).toBe(409);
  });

  test('liste les co-admins mais pas soi-même', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await request(app).post('/api/admin/invites')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Co Admin', email: 'coadmin3@example.com' });

    const res = await request(app).get('/api/admin/invites')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('coadmin3@example.com');
  });

  test('un formateur ne peut pas inviter d\'admin', async () => {
    const school = await createSchool();
    const instructor = await createUser({ role: 'instructor', school: school._id });
    const res = await request(app).post('/api/admin/invites')
      .set('Authorization', `Bearer ${getAuthToken(instructor)}`)
      .send({ name: 'X', email: 'x@example.com' });
    expect(res.status).toBe(403);
  });
});
