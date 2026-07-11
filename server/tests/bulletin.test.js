const testDb = require('./utils/testDb');
const { createUser, createCourse, createEnrollment, createEvaluation, createGrade } = require('./utils/factories');
const { computeStudentBulletin } = require('../controllers/evaluationController');

beforeAll(async () => testDb.connect());
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

async function enroll(student, course) {
  await createEnrollment({ student: student._id, course: course._id });
}

describe('computeStudentBulletin', () => {
  test('moyenne pondérée avec les 3 types (interro=1, devoir=2, composition=3)', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    await enroll(student, course);

    const interro = await createEvaluation({ course: course._id, type: 'interrogation', sequence: 1 });
    await createGrade({ evaluation: interro._id, student: student._id, course: course._id, score: 10 });

    const devoir = await createEvaluation({ course: course._id, type: 'devoir' });
    await createGrade({ evaluation: devoir._id, student: student._id, course: course._id, score: 16 });

    const composition = await createEvaluation({ course: course._id, type: 'composition' });
    await createGrade({ evaluation: composition._id, student: student._id, course: course._id, score: 12 });

    const { bulletin, moyenneGenerale } = await computeStudentBulletin(student._id, 1);

    // (10*1 + 16*2 + 12*3) / (1+2+3) = 78/6 = 13
    expect(bulletin[0].moyenne).toBe(13);
    expect(moyenneGenerale).toBe(13);
  });

  test('une évaluation non signée n\'entre pas dans le calcul', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    await enroll(student, course);

    const ev = await createEvaluation({ course: course._id, type: 'devoir', signed: false });
    await createGrade({ evaluation: ev._id, student: student._id, course: course._id, score: 5 });

    const { bulletin, moyenneGenerale } = await computeStudentBulletin(student._id, 1);
    expect(bulletin[0].moyenne).toBeNull();
    expect(moyenneGenerale).toBeNull();
  });

  test('un élève absent n\'entre pas dans le calcul', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    await enroll(student, course);

    const ev1 = await createEvaluation({ course: course._id, type: 'devoir' });
    await createGrade({ evaluation: ev1._id, student: student._id, course: course._id, score: 10, absent: true });

    const ev2 = await createEvaluation({ course: course._id, type: 'composition' });
    await createGrade({ evaluation: ev2._id, student: student._id, course: course._id, score: 18 });

    const { bulletin } = await computeStudentBulletin(student._id, 1);
    // seule la composition (score 18) compte
    expect(bulletin[0].moyenne).toBe(18);
  });

  test('moyenneGenerale moyenne les moyennes de chaque cours', async () => {
    const student = await createUser({ role: 'student' });
    const courseA = await createCourse({ subject: 'Maths' });
    const courseB = await createCourse({ subject: 'SVT' });
    await enroll(student, courseA);
    await enroll(student, courseB);

    const evA = await createEvaluation({ course: courseA._id, type: 'devoir' });
    await createGrade({ evaluation: evA._id, student: student._id, course: courseA._id, score: 10 });

    const evB = await createEvaluation({ course: courseB._id, type: 'devoir' });
    await createGrade({ evaluation: evB._id, student: student._id, course: courseB._id, score: 20 });

    const { moyenneGenerale } = await computeStudentBulletin(student._id, 1);
    expect(moyenneGenerale).toBe(15);
  });

  test('isComplete vrai seulement quand toutes les évaluations requises sont notées', async () => {
    const student = await createUser({ role: 'student' });
    const course = await createCourse();
    await enroll(student, course);

    const i1 = await createEvaluation({ course: course._id, type: 'interrogation', sequence: 1 });
    await createGrade({ evaluation: i1._id, student: student._id, course: course._id, score: 10 });

    // manque la 2e interrogation, le devoir et la composition
    const incomplete = await computeStudentBulletin(student._id, 1);
    expect(incomplete.isComplete).toBe(false);

    const i2 = await createEvaluation({ course: course._id, type: 'interrogation', sequence: 2 });
    await createGrade({ evaluation: i2._id, student: student._id, course: course._id, score: 12 });
    const devoir = await createEvaluation({ course: course._id, type: 'devoir' });
    await createGrade({ evaluation: devoir._id, student: student._id, course: course._id, score: 14 });
    const composition = await createEvaluation({ course: course._id, type: 'composition' });
    await createGrade({ evaluation: composition._id, student: student._id, course: course._id, score: 16 });

    const complete = await computeStudentBulletin(student._id, 1);
    expect(complete.isComplete).toBe(true);
  });

  test('aucun cours suivi => moyenneGenerale null', async () => {
    const student = await createUser({ role: 'student' });
    const { moyenneGenerale, bulletin } = await computeStudentBulletin(student._id, 1);
    expect(bulletin).toEqual([]);
    expect(moyenneGenerale).toBeNull();
  });
});
