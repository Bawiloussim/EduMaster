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

describe('Gestion manuelle des élèves', () => {
  test('crée un élève sans classe', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Alice Élève', email: 'alice@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.data.tempPassword).toBeDefined();
  });

  test('crée un élève avec une classe existante et l\'inscrit aux cours correspondants', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const token = getAuthToken(admin);
    await request(app).post('/api/classes').set('Authorization', `Bearer ${token}`).send({ classe: '6ème' });

    const res = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bob Élève', email: 'bob@example.com', classe: '6ème', matricule: 'M001', phone: '690000000', gender: 'M' });
    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('6ème');
  });

  test('refuse une classe qui n\'existe pas encore pour l\'école', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Carl Élève', email: 'carl@example.com', classe: '6ème' });
    expect(res.status).toBe(422);
  });

  test('refuse un email déjà utilisé', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await createUser({ email: 'dup@example.com', school: school._id });
    const res = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Dup', email: 'dup@example.com' });
    expect(res.status).toBe(409);
  });

  test('modifie un élève', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Eve', email: 'eve@example.com' });

    const res = await request(app).patch(`/api/admin/students/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ matricule: 'M999' });
    expect(res.status).toBe(200);
    expect(res.body.data.matricule).toBe('M999');
  });

  test('réinitialise le mot de passe d\'un élève', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Faye', email: 'faye@example.com' });

    const res = await request(app).patch(`/api/admin/students/${createRes.body.data._id}/reset-password`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tempPassword).toBeDefined();
  });

  test('supprime un élève', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Gwen', email: 'gwen@example.com' });

    const res = await request(app).delete(`/api/admin/students/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
  });

  test('un admin ne peut pas gérer les élèves d\'une autre école', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const studentB = await createUser({ role: 'student', school: schoolB._id });

    const res = await request(app).delete(`/api/admin/students/${studentB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`);
    expect(res.status).toBe(404);
  });
});

describe('Gestion manuelle des formateurs', () => {
  test('crée un formateur', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/admin/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Jean Formateur', email: 'jean@example.com', phone: '691111111', gender: 'M' });
    expect(res.status).toBe(201);
    expect(res.body.data.tempPassword).toBeDefined();
  });

  test('modifie un formateur', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/admin/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Marc', email: 'marc@example.com' });

    const res = await request(app).patch(`/api/admin/instructors/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Marc Dupont' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Marc Dupont');
  });

  test('réinitialise le mot de passe d\'un formateur', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/admin/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Nora', email: 'nora@example.com' });

    const res = await request(app).patch(`/api/admin/instructors/${createRes.body.data._id}/reset-password`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tempPassword).toBeDefined();
  });

  test('supprime un formateur', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/admin/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Omar', email: 'omar@example.com' });

    const res = await request(app).delete(`/api/admin/instructors/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
  });
});
