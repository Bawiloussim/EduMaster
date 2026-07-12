const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, getAuthToken, createCourse, createLesson, createExercise, createEnrollment } = require('./utils/factories');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('POST /api/exercises/:id/answer', () => {
  test('refuse une soumission sans réponse texte ni fichier', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    const lesson = await createLesson({ course: course._id });
    const exercise = await createExercise({ lesson: lesson._id, course: course._id, type: 'open' });

    const res = await request(app).post(`/api/exercises/${exercise._id}/answer`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .send({ answer: '' });

    expect(res.status).toBe(422);
  });

  test('accepte une soumission avec un fichier seul (sans texte)', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    const lesson = await createLesson({ course: course._id });
    const exercise = await createExercise({ lesson: lesson._id, course: course._id, type: 'open' });

    const res = await request(app).post(`/api/exercises/${exercise._id}/answer`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .attach('answerFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'devoir.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.data.answerFileName).toBe('devoir.pdf');
    expect(res.body.data.answerFileUrl).toBeTruthy();
  });

  test('resoumettre avec un fichier met à jour la réponse existante', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    const lesson = await createLesson({ course: course._id });
    const exercise = await createExercise({ lesson: lesson._id, course: course._id, type: 'open' });

    await request(app).post(`/api/exercises/${exercise._id}/answer`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .send({ answer: 'Première tentative' });

    const res = await request(app).post(`/api/exercises/${exercise._id}/answer`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .attach('answerFile', Buffer.from('%PDF-1.4\ntest'), { filename: 'v2.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.data.answerFileName).toBe('v2.pdf');
    expect(res.body.data.answer).toBe('Première tentative');
  });

  test('le QCM reste auto-corrigé indépendamment du fichier', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    const lesson = await createLesson({ course: course._id });
    const exercise = await createExercise({ lesson: lesson._id, course: course._id, type: 'qcm', options: ['A', 'B'], correctOption: 1 });

    const res = await request(app).post(`/api/exercises/${exercise._id}/answer`)
      .set('Authorization', `Bearer ${getAuthToken(student)}`)
      .send({ answer: '1' });

    expect(res.status).toBe(201);
    expect(res.body.isCorrect).toBe(true);
  });
});
