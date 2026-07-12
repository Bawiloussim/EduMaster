const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, getAuthToken, createCourse, createSchool, createEnrollment, createEvaluation, createGrade } = require('./utils/factories');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

async function gradedStudent({ school, classe, serie, score }) {
  const student = await createUser({ role: 'student', school, classe, serie });
  const course = await createCourse({ school, classe, serie: serie ?? null });
  await createEnrollment({ student: student._id, course: course._id });
  const ev = await createEvaluation({ course: course._id, type: 'devoir' });
  await createGrade({ evaluation: ev._id, student: student._id, course: course._id, score });
  return student;
}

describe('GET /api/admin/palmares', () => {
  test('classe les élèves par moyenne décroissante', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const top = await gradedStudent({ school: school._id, classe: 'Terminale', serie: 'D', score: 18 });
    const bottom = await gradedStudent({ school: school._id, classe: 'Terminale', serie: 'D', score: 8 });

    const res = await request(app).get('/api/admin/palmares')
      .query({ classe: 'Terminale', serie: 'D', trimestre: 1 })
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    const ranking = res.body.data.ranking;
    expect(ranking[0].student._id).toBe(top._id.toString());
    expect(ranking[0].rang).toBe(1);
    expect(ranking[1].student._id).toBe(bottom._id.toString());
    expect(ranking[1].rang).toBe(2);
  });

  test('les élèves sans moyenne sont non classés, en fin de liste', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    await gradedStudent({ school: school._id, classe: 'Première', serie: 'A4', score: 14 });
    await createUser({ role: 'student', school: school._id, classe: 'Première', serie: 'A4' }); // pas de note

    const res = await request(app).get('/api/admin/palmares')
      .query({ classe: 'Première', serie: 'A4', trimestre: 1 })
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    const ranking = res.body.data.ranking;
    expect(ranking).toHaveLength(2);
    expect(ranking[0].rang).toBe(1);
    expect(ranking[1].rang).toBeNull();
    expect(ranking[1].moyenneGenerale).toBeNull();
  });

  test('422 si serie manquante pour une classe de lycée', async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app).get('/api/admin/palmares')
      .query({ classe: 'Terminale', trimestre: 1 })
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.status).toBe(422);
  });

  test('fonctionne sans serie pour une classe de collège', async () => {
    const school = await createSchool();
    const admin = await createUser({ role: 'admin', school: school._id });
    const student = await gradedStudent({ school: school._id, classe: '5ème', serie: null, score: 11 });

    const res = await request(app).get('/api/admin/palmares')
      .query({ classe: '5ème', trimestre: 1 })
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.serie).toBeNull();
    expect(res.body.data.ranking[0].student._id).toBe(student._id.toString());
  });

  test('refuse l\'accès à un élève', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app).get('/api/admin/palmares')
      .query({ classe: 'Terminale', serie: 'D', trimestre: 1 })
      .set('Authorization', `Bearer ${getAuthToken(student)}`);
    expect(res.status).toBe(403);
  });
});
