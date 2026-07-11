const testDb = require('./utils/testDb');
const { createUser, createCourse } = require('./utils/factories');
const { syncClassEnrollments, syncCourseEnrollments } = require('../controllers/enrollmentController');
const Enrollment = require('../models/Enrollment');

beforeAll(async () => testDb.connect());
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe('syncClassEnrollments', () => {
  test('inscrit un élève de collège aux cours publiés de sa classe (sans série)', async () => {
    const course = await createCourse({ classe: '5ème', serie: null, status: 'published' });
    const student = await createUser({ role: 'student', classe: '5ème', serie: null });

    await syncClassEnrollments(student._id, '5ème', null);

    const enrollments = await Enrollment.find({ student: student._id });
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].course.toString()).toBe(course._id.toString());
  });

  test('un cours de lycée ne matche que la bonne série', async () => {
    await createCourse({ classe: 'Terminale', serie: 'D', status: 'published' });
    await createCourse({ classe: 'Terminale', serie: 'A4', status: 'published' });
    const student = await createUser({ role: 'student', classe: 'Terminale', serie: 'D' });

    await syncClassEnrollments(student._id, 'Terminale', 'D');

    const enrollments = await Enrollment.find({ student: student._id }).populate('course');
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].course.serie).toBe('D');
  });

  test('ne fait rien pour une classe de lycée sans série fournie', async () => {
    await createCourse({ classe: 'Terminale', serie: 'D', status: 'published' });
    const student = await createUser({ role: 'student' });

    await syncClassEnrollments(student._id, 'Terminale', undefined);

    const enrollments = await Enrollment.find({ student: student._id });
    expect(enrollments).toHaveLength(0);
  });

  test('ne crée pas de doublon si appelé deux fois', async () => {
    const course = await createCourse({ classe: '3ème', serie: null, status: 'published' });
    const student = await createUser({ role: 'student', classe: '3ème', serie: null });

    await syncClassEnrollments(student._id, '3ème', null);
    await syncClassEnrollments(student._id, '3ème', null);

    const enrollments = await Enrollment.find({ student: student._id, course: course._id });
    expect(enrollments).toHaveLength(1);
  });

  test('ignore les cours en brouillon', async () => {
    await createCourse({ classe: '4ème', serie: null, status: 'draft' });
    const student = await createUser({ role: 'student' });

    await syncClassEnrollments(student._id, '4ème', null);

    const enrollments = await Enrollment.find({ student: student._id });
    expect(enrollments).toHaveLength(0);
  });
});

describe('syncCourseEnrollments', () => {
  test('inscrit tous les élèves de la classe quand un cours de collège est publié', async () => {
    const studentA = await createUser({ role: 'student', classe: '6ème', serie: null });
    const studentB = await createUser({ role: 'student', classe: '6ème', serie: null });
    const course = await createCourse({ classe: '6ème', serie: null, status: 'published' });

    await syncCourseEnrollments(course);

    const enrollments = await Enrollment.find({ course: course._id });
    expect(enrollments.map((e) => e.student.toString()).sort()).toEqual(
      [studentA._id.toString(), studentB._id.toString()].sort()
    );
  });

  test('ne fait rien si le cours n\'est pas publié', async () => {
    const student = await createUser({ role: 'student', classe: 'Seconde', serie: 'A4' });
    const course = await createCourse({ classe: 'Seconde', serie: 'A4', status: 'draft' });

    await syncCourseEnrollments(course);

    const enrollments = await Enrollment.find({ course: course._id });
    expect(enrollments).toHaveLength(0);
  });
});
