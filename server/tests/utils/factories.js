const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const School = require('../../models/School');
const Course = require('../../models/Course');
const Enrollment = require('../../models/Enrollment');
const Evaluation = require('../../models/Evaluation');
const Grade = require('../../models/Grade');
const Lesson = require('../../models/Lesson');
const Exercise = require('../../models/Exercise');

let counter = 0;
const uniq = () => `${Date.now()}-${counter++}`;

async function createSchool(overrides = {}) {
  return School.create({
    name: overrides.name || `École ${uniq()}`,
    city: overrides.city || 'Douala',
    status: overrides.status || 'active',
    logo: overrides.logo || '',
    address: overrides.address || '',
    phone: overrides.phone || '',
    email: overrides.email || '',
    currency: overrides.currency || 'XAF',
    academicYearLabel: overrides.academicYearLabel || '',
    academicYearStart: overrides.academicYearStart || null,
    academicYearEnd: overrides.academicYearEnd || null,
  });
}

async function createUser(overrides = {}) {
  const role = overrides.role || 'student';
  let school = overrides.school;
  if (school === undefined && role !== 'superadmin') {
    school = (await createSchool())._id;
  }
  return User.create({
    name: overrides.name || `Test User ${uniq()}`,
    email: overrides.email || `user-${uniq()}@example.com`,
    password: overrides.password || 'Test1234!',
    role,
    school: school ?? null,
    status: overrides.status || 'active',
    emailVerified: overrides.emailVerified ?? true,
    classe: overrides.classe ?? null,
    serie: overrides.serie ?? null,
    matricule: overrides.matricule || '',
    phone: overrides.phone || '',
    gender: overrides.gender ?? null,
    birthDate: overrides.birthDate ?? null,
  });
}

function getAuthToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
}

async function createCourse(overrides = {}) {
  let instructor = overrides.instructor;
  let school = overrides.school;
  if (!instructor) {
    const instructorUser = await createUser({ role: 'instructor', school });
    instructor = instructorUser._id;
    school = instructorUser.school;
  }
  if (!school) school = (await createSchool())._id;
  return Course.create({
    title: overrides.title || `Cours ${uniq()}`,
    subject: overrides.subject || 'Mathématiques',
    classe: overrides.classe || 'Terminale',
    serie: overrides.serie !== undefined ? overrides.serie : 'D',
    status: overrides.status || 'published',
    instructor,
    school,
  });
}

async function createEnrollment(overrides = {}) {
  return Enrollment.create({
    student: overrides.student,
    course: overrides.course,
    progress: overrides.progress || 0,
  });
}

async function createEvaluation(overrides = {}) {
  return Evaluation.create({
    course: overrides.course,
    trimestre: overrides.trimestre || 1,
    type: overrides.type || 'devoir',
    sequence: overrides.sequence || 1,
    title: overrides.title || 'Évaluation test',
    maxScore: overrides.maxScore || 20,
    signed: overrides.signed !== undefined ? overrides.signed : true,
    subjectUrl: overrides.subjectUrl !== undefined ? overrides.subjectUrl : '',
  });
}

async function createGrade(overrides = {}) {
  return Grade.create({
    evaluation: overrides.evaluation,
    student: overrides.student,
    course: overrides.course,
    trimestre: overrides.trimestre || 1,
    score: overrides.score !== undefined ? overrides.score : 15,
    absent: overrides.absent || false,
  });
}

async function createLesson(overrides = {}) {
  return Lesson.create({
    course: overrides.course,
    title: overrides.title || `Leçon ${uniq()}`,
    order: overrides.order || 0,
  });
}

async function createExercise(overrides = {}) {
  return Exercise.create({
    lesson: overrides.lesson,
    course: overrides.course,
    statement: overrides.statement || 'Énoncé test',
    type: overrides.type || 'open',
    options: overrides.options || [],
    correctOption: overrides.correctOption ?? null,
  });
}

module.exports = { createSchool, createUser, getAuthToken, createCourse, createEnrollment, createEvaluation, createGrade, createLesson, createExercise };
