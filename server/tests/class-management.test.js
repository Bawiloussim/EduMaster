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

describe('Gestion des classes', () => {
  test('crée une classe de collège sans série', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });
    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('6ème');
    expect(res.body.data.serie).toBeNull();
  });

  test('crée une classe de lycée avec sa série', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: 'Terminale', serie: 'D' });
    expect(res.status).toBe(201);
    expect(res.body.data.serie).toBe('D');
  });

  test('refuse une classe de lycée sans série', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: 'Terminale' });
    expect(res.status).toBe(422);
  });

  test('refuse un doublon classe+série pour la même école', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: 'Terminale', serie: 'D' });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: 'Terminale', serie: 'D' });
    expect(res.status).toBe(409);
  });

  test('la même classe+série est permise dans deux écoles différentes', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const adminB = await createUser({ role: 'admin', school: schoolB._id });
    await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .send({ classe: 'Terminale', serie: 'D' });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(adminB)}`)
      .send({ classe: 'Terminale', serie: 'D' });
    expect(res.status).toBe(201);
  });

  test('affecte un professeur principal valide', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const teacher = await createUser({ role: 'instructor', school: school._id });
    const createRes = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    const res = await request(app).patch(`/api/classes/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ mainTeacher: teacher._id });
    expect(res.status).toBe(200);
    expect(res.body.data.mainTeacher._id).toBe(teacher._id.toString());
  });

  test('refuse un professeur principal d\'une autre école', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const admin = await createUser({ role: 'admin', school: schoolA._id });
    const teacherB = await createUser({ role: 'instructor', school: schoolB._id });
    const createRes = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    const res = await request(app).patch(`/api/classes/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ mainTeacher: teacherB._id });
    expect(res.status).toBe(422);
  });

  test('liste les classes avec le nombre d\'élèves', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });
    await createUser({ role: 'student', school: school._id, classe: '6ème' });

    const res = await request(app).get('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].studentsCount).toBe(1);
  });

  test('supprime une classe', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    const res = await request(app).delete(`/api/classes/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
  });

  test('un formateur ne peut pas gérer les classes', async () => {
    const school = await createSchool();
    const instructor = await createUser({ role: 'instructor', school: school._id });
    const res = await request(app).get('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(instructor)}`);
    expect(res.status).toBe(403);
  });
});
