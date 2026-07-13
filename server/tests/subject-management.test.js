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

describe('Gestion des matières', () => {
  test('crée une matière', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const res = await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Mathématiques' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Mathématiques');
  });

  test('refuse un doublon (insensible à la casse) pour la même école', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Mathématiques' });
    const res = await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'mathématiques' });
    expect(res.status).toBe(409);
  });

  test('la même matière est permise dans deux écoles différentes', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const adminB = await createUser({ role: 'admin', school: schoolB._id });
    await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .send({ name: 'Mathématiques' });
    const res = await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${getAuthToken(adminB)}`)
      .send({ name: 'Mathématiques' });
    expect(res.status).toBe(201);
  });

  test('supprime une matière non utilisée', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const createRes = await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Histoire' });
    const res = await request(app).delete(`/api/subjects/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(200);
  });
});

describe('Affectation matière → classe/enseignant', () => {
  async function setup() {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const teacher = await createUser({ role: 'instructor', school: school._id });
    const token = getAuthToken(admin);
    const classRes = await request(app).post('/api/classes')
      .set('Authorization', `Bearer ${token}`).send({ classe: 'Terminale', serie: 'D' });
    const subjectRes = await request(app).post('/api/subjects')
      .set('Authorization', `Bearer ${token}`).send({ name: 'Mathématiques' });
    return { school, admin, teacher, token, classId: classRes.body.data._id, subjectId: subjectRes.body.data._id };
  }

  test('affecter une matière à une classe crée un cours brouillon', async () => {
    const { token, classId, subjectId, teacher } = await setup();
    const res = await request(app).post(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId, teacherId: teacher._id });
    expect(res.status).toBe(201);
    expect(res.body.data.subject).toBe('Mathématiques');
    expect(res.body.data.classe).toBe('Terminale');
    expect(res.body.data.serie).toBe('D');
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.instructor).toBe(teacher._id.toString());
  });

  test('affecter deux fois la même matière/classe/enseignant est idempotent', async () => {
    const { token, classId, subjectId, teacher } = await setup();
    const first = await request(app).post(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`).send({ subjectId, teacherId: teacher._id });
    const second = await request(app).post(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`).send({ subjectId, teacherId: teacher._id });
    expect(second.status).toBe(200);
    expect(second.body.data._id).toBe(first.body.data._id);
  });

  test('refuse un enseignant d\'une autre école', async () => {
    const { token, classId, subjectId } = await setup();
    const otherSchool = await createSchool();
    const otherTeacher = await createUser({ role: 'instructor', school: otherSchool._id });
    const res = await request(app).post(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId, teacherId: otherTeacher._id });
    expect(res.status).toBe(422);
  });

  test('liste les cours affectés à une classe', async () => {
    const { token, classId, subjectId, teacher } = await setup();
    await request(app).post(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`).send({ subjectId, teacherId: teacher._id });
    const res = await request(app).get(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('retire une affectation', async () => {
    const { token, classId, subjectId, teacher } = await setup();
    const assignRes = await request(app).post(`/api/classes/${classId}/courses`)
      .set('Authorization', `Bearer ${token}`).send({ subjectId, teacherId: teacher._id });
    const res = await request(app).delete(`/api/classes/${classId}/courses/${assignRes.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
