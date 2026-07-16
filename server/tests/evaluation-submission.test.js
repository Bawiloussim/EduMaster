const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, getAuthToken, createCourse, createEvaluation, createEnrollment } = require('./utils/factories');
const Grade = require('../models/Grade');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

async function setupStudentAndEvaluation(overrides = {}) {
  const student = await createUser({ role: 'student' });
  const course = await createCourse();
  const evaluation = await createEvaluation({ course: course._id, signed: false, subjectUrl: '/uploads/sujet-test.pdf', ...overrides });
  await createEnrollment({ student: student._id, course: course._id });
  return { student, course, evaluation };
}

describe('POST /api/evaluations/:id/submission', () => {
  test("crée un Grade avec la soumission si aucun n'existait", async () => {
    const { student, evaluation } = await setupStudentAndEvaluation();

    const res = await request(app).post(`/api/evaluations/${evaluation._id}/submission`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .attach('submissionFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'copie.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.data.submissionName).toBe('copie.pdf');
    expect(res.body.data.score).toBeNull();
  });

  test('refuse si l\'élève n\'est pas inscrit au cours', async () => {
    const outsider = await createUser({ role: 'student' });
    const course = await createCourse();
    const evaluation = await createEvaluation({ course: course._id, signed: false });

    const res = await request(app).post(`/api/evaluations/${evaluation._id}/submission`)
      .set('Authorization', `Bearer ${getAuthToken(outsider)}`)
      .attach('submissionFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'copie.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(403);
  });

  test("refuse si le sujet n'a pas encore été envoyé par le professeur", async () => {
    const { student, evaluation } = await setupStudentAndEvaluation({ subjectUrl: '' });

    const res = await request(app).post(`/api/evaluations/${evaluation._id}/submission`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .attach('submissionFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'copie.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(422);
  });

  test('refuse si l\'évaluation est déjà signée', async () => {
    const { student, evaluation } = await setupStudentAndEvaluation({ signed: true });

    const res = await request(app).post(`/api/evaluations/${evaluation._id}/submission`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .attach('submissionFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'copie.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(409);
  });

  test('RÉGRESSION : la soumission survit à un saveGrades ultérieur du formateur', async () => {
    const { student, course, evaluation } = await setupStudentAndEvaluation();
    const instructor = await require('../models/User').findById(course.instructor);

    // 1. L'élève envoie sa copie avant toute notation
    await request(app).post(`/api/evaluations/${evaluation._id}/submission`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .attach('submissionFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'copie.pdf', contentType: 'application/pdf' });

    // 2. Le formateur note ensuite via saveGrades (upsert historiquement destructif)
    const gradeRes = await request(app).post(`/api/evaluations/${evaluation._id}/grades`)
      .set('Authorization', `Bearer ${getAuthToken(instructor)}`)
      .send({ grades: [{ studentId: student._id.toString(), score: 15, absent: false, comment: '' }] });
    expect(gradeRes.status).toBe(200);

    // 3. La soumission de l'élève doit avoir survécu
    const grade = await Grade.findOne({ evaluation: evaluation._id, student: student._id });
    expect(grade.score).toBe(15);
    expect(grade.submissionName).toBe('copie.pdf');
    expect(grade.submissionUrl).toBeTruthy();
  });
});
