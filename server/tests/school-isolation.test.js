const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, createCourse, createSchool, getAuthToken } = require('./utils/factories');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('Isolation entre établissements', () => {
  test('le catalogue d\'un élève ne montre jamais les cours d\'un autre établissement', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const studentA = await createUser({ role: 'student', school: schoolA._id, classe: 'Terminale', serie: 'D' });
    await createCourse({ school: schoolA._id, classe: 'Terminale', serie: 'D', status: 'published' });
    const courseB = await createCourse({ school: schoolB._id, classe: 'Terminale', serie: 'D', status: 'published' });

    const res = await request(app).get('/api/courses')
      .query({ classe: 'Terminale', serie: 'D' })
      .set('Authorization', `Bearer ${getAuthToken(studentA)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c._id === courseB._id.toString())).toBe(false);
  });

  test('un cours d\'un autre établissement renvoie 404 en détail', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const studentA = await createUser({ role: 'student', school: schoolA._id });
    const courseB = await createCourse({ school: schoolB._id, status: 'published' });

    const res = await request(app).get(`/api/courses/${courseB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(studentA)}`);

    expect(res.status).toBe(404);
  });

  test('un chef d\'établissement ne peut pas modifier un cours d\'un autre établissement', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const courseB = await createCourse({ school: schoolB._id });

    const res = await request(app).put(`/api/courses/${courseB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .send({ title: 'Piraté' });

    expect(res.status).toBe(403);
  });

  test('la liste admin des utilisateurs ne montre que son propre établissement', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const studentA = await createUser({ role: 'student', school: schoolA._id });
    const studentB = await createUser({ role: 'student', school: schoolB._id });

    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((u) => u._id);
    expect(ids).toContain(studentA._id.toString());
    expect(ids).not.toContain(studentB._id.toString());
  });

  test('un chef d\'établissement ne peut pas changer le rôle d\'un utilisateur d\'un autre établissement', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const studentB = await createUser({ role: 'student', school: schoolB._id });

    const res = await request(app).patch(`/api/admin/users/${studentB._id}/role`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .send({ role: 'instructor' });

    expect(res.status).toBe(403);
  });

  test('un import de cours ne peut résoudre un formateur que dans son propre établissement', async () => {
    const schoolA = await createSchool();
    const schoolB = await createSchool();
    const adminA = await createUser({ role: 'admin', school: schoolA._id });
    const instructorB = await createUser({ role: 'instructor', school: schoolB._id, email: 'prof.b@example.com' });

    const file = Buffer.from(['matiere,classe,serie,email_formateur', `Maths,Terminale,D,${instructorB.email}`].join('\n'));
    const res = await request(app).post('/api/admin/import/courses')
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .attach('file', file, 'cours.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(0);
    expect(res.body.data.errors[0].reason).toBe('Formateur introuvable');
  });
});
