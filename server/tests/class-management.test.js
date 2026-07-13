const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, createSchool, getAuthToken } = require('./utils/factories');
const Class = require('../models/Class');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('POST /api/classes', () => {
  test("un chef d'établissement peut créer une classe de collège sans série", async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('6ème');
    expect(res.body.data.serie).toBeNull();
  });

  test('rejette une classe de lycée sans série', async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: 'Terminale' });

    expect(res.status).toBe(422);
  });

  test('rejette la création en double (index unique)', async () => {
    const admin = await createUser({ role: 'admin' });
    await Class.create({ school: admin.school, classe: '6ème', serie: null });

    const res = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ classe: '6ème' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/classes', () => {
  test('inclut le nombre d\'élèves en direct', async () => {
    const admin = await createUser({ role: 'admin' });
    const cls = await Class.create({ school: admin.school, classe: '6ème', serie: null });
    await createUser({ role: 'student', school: admin.school, classe: '6ème' });
    await createUser({ role: 'student', school: admin.school, classe: '6ème' });

    const res = await request(app).get('/api/classes')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    const row = res.body.data.find((c) => c._id === cls._id.toString());
    expect(row.studentsCount).toBe(2);
  });
});

describe('PATCH /api/classes/:id', () => {
  test('affecte un professeur principal', async () => {
    const admin = await createUser({ role: 'admin' });
    const cls = await Class.create({ school: admin.school, classe: '6ème', serie: null });
    const teacher = await createUser({ role: 'instructor', school: admin.school });

    const res = await request(app).patch(`/api/classes/${cls._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ mainTeacher: teacher._id });

    expect(res.status).toBe(200);
    expect(res.body.data.mainTeacher._id).toBe(teacher._id.toString());
  });

  test("rejette un professeur d'un autre établissement", async () => {
    const admin = await createUser({ role: 'admin' });
    const schoolB = await createSchool();
    const cls = await Class.create({ school: admin.school, classe: '6ème', serie: null });
    const teacher = await createUser({ role: 'instructor', school: schoolB._id });

    const res = await request(app).patch(`/api/classes/${cls._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ mainTeacher: teacher._id });

    expect(res.status).toBe(422);
  });
});

describe('DELETE /api/classes/:id', () => {
  test('supprime une classe', async () => {
    const admin = await createUser({ role: 'admin' });
    const cls = await Class.create({ school: admin.school, classe: '6ème', serie: null });

    const res = await request(app).delete(`/api/classes/${cls._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    expect(await Class.findById(cls._id)).toBeNull();
  });
});

describe('Isolation entre établissements', () => {
  test("un chef ne peut ni modifier ni supprimer la classe d'un autre établissement", async () => {
    const adminA = await createUser({ role: 'admin' });
    const schoolB = await createSchool();
    const clsB = await Class.create({ school: schoolB._id, classe: '6ème', serie: null });

    const patchRes = await request(app).patch(`/api/classes/${clsB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .send({ mainTeacher: null });
    expect(patchRes.status).toBe(404);

    const deleteRes = await request(app).delete(`/api/classes/${clsB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`);
    expect(deleteRes.status).toBe(404);

    expect(await Class.findById(clsB._id)).not.toBeNull();
  });
});
