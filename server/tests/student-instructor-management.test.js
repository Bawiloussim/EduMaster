const request = require('supertest');
const testDb = require('./utils/testDb');
const { createUser, createSchool, getAuthToken } = require('./utils/factories');
const Class = require('../models/Class');
const User = require('../models/User');

let app;

beforeAll(async () => {
  await testDb.connect();
  app = require('../app');
});
afterEach(async () => testDb.clearDatabase());
afterAll(async () => testDb.closeDatabase());

describe("Élèves — CRUD chef d'établissement", () => {
  test('crée un élève avec une classe existante', async () => {
    const admin = await createUser({ role: 'admin' });
    await Class.create({ school: admin.school, classe: '6ème', serie: null });

    const res = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Elève Test', email: 'eleve.test@example.com', classe: '6ème' });

    expect(res.status).toBe(201);
    expect(res.body.data.classe).toBe('6ème');
    const created = await User.findOne({ email: 'eleve.test@example.com' });
    expect(created.school.toString()).toBe(admin.school.toString());
    expect(created.emailVerified).toBe(true);
  });

  test("rejette la création si la classe n'existe pas encore pour l'établissement", async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app).post('/api/admin/students')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Elève Test', email: 'eleve2@example.com', classe: '6ème' });

    expect(res.status).toBe(422);
  });

  test('modifie un élève', async () => {
    const admin = await createUser({ role: 'admin' });
    const student = await createUser({ role: 'student', school: admin.school });

    const res = await request(app).patch(`/api/admin/students/${student._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Nouveau Nom', matricule: 'MAT123' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Nouveau Nom');
    expect(res.body.data.matricule).toBe('MAT123');
  });

  test("réinitialise le mot de passe d'un élève", async () => {
    const admin = await createUser({ role: 'admin' });
    const student = await createUser({ role: 'student', school: admin.school });

    const res = await request(app).patch(`/api/admin/students/${student._id}/reset-password`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tempPassword).toBeTruthy();
  });

  test('désactive puis réactive un élève, ce qui bloque puis débloque la connexion', async () => {
    const admin = await createUser({ role: 'admin' });
    const student = await createUser({ role: 'student', school: admin.school, password: 'Test1234!' });

    const suspendRes = await request(app).patch(`/api/admin/students/${student._id}/status`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.status).toBe('suspended');

    const loginBlocked = await request(app).post('/api/auth/login').send({ email: student.email, password: 'Test1234!' });
    expect(loginBlocked.status).toBe(403);

    const reactivateRes = await request(app).patch(`/api/admin/students/${student._id}/status`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(reactivateRes.body.data.status).toBe('active');

    const loginOk = await request(app).post('/api/auth/login').send({ email: student.email, password: 'Test1234!' });
    expect(loginOk.status).toBe(200);
  });

  test('supprime un élève', async () => {
    const admin = await createUser({ role: 'admin' });
    const student = await createUser({ role: 'student', school: admin.school });

    const res = await request(app).delete(`/api/admin/students/${student._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    expect(await User.findById(student._id)).toBeNull();
  });

  test("un chef ne peut pas gérer un élève d'un autre établissement", async () => {
    const adminA = await createUser({ role: 'admin' });
    const schoolB = await createSchool();
    const studentB = await createUser({ role: 'student', school: schoolB._id });

    const patchRes = await request(app).patch(`/api/admin/students/${studentB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`)
      .send({ name: 'Piraté' });
    expect(patchRes.status).toBe(404);

    const deleteRes = await request(app).delete(`/api/admin/students/${studentB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`);
    expect(deleteRes.status).toBe(404);

    expect(await User.findById(studentB._id)).not.toBeNull();
  });
});

describe("Formateurs — CRUD chef d'établissement", () => {
  test('crée un formateur', async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app).post('/api/admin/instructors')
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ name: 'Prof Test', email: 'prof.test2@example.com', subjects: ['Mathématiques'] });

    expect(res.status).toBe(201);
    const created = await User.findOne({ email: 'prof.test2@example.com' });
    expect(created.role).toBe('instructor');
    expect(created.school.toString()).toBe(admin.school.toString());
  });

  test("réinitialise le mot de passe d'un formateur", async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', school: admin.school });

    const res = await request(app).patch(`/api/admin/instructors/${instructor._id}/reset-password`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tempPassword).toBeTruthy();
  });

  test('désactive un formateur, ce qui bloque la connexion', async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', school: admin.school, password: 'Test1234!' });

    const res = await request(app).patch(`/api/admin/instructors/${instructor._id}/status`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);
    expect(res.body.data.status).toBe('suspended');

    const loginBlocked = await request(app).post('/api/auth/login').send({ email: instructor.email, password: 'Test1234!' });
    expect(loginBlocked.status).toBe(403);
  });

  test('affecte des classes et des matières', async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', school: admin.school });
    const cls = await Class.create({ school: admin.school, classe: '6ème', serie: null });

    const res = await request(app).patch(`/api/admin/instructors/${instructor._id}/assignments`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ assignedClasses: [cls._id], subjects: ['SVT', 'Physique'] });

    expect(res.status).toBe(200);
    expect(res.body.data.subjects).toEqual(['SVT', 'Physique']);
    expect(res.body.data.assignedClasses[0]._id).toBe(cls._id.toString());
  });

  test("n'affecte pas une classe d'un autre établissement", async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', school: admin.school });
    const schoolB = await createSchool();
    const clsB = await Class.create({ school: schoolB._id, classe: '6ème', serie: null });

    const res = await request(app).patch(`/api/admin/instructors/${instructor._id}/assignments`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`)
      .send({ assignedClasses: [clsB._id] });

    expect(res.status).toBe(200);
    expect(res.body.data.assignedClasses).toHaveLength(0);
  });

  test('supprime un formateur', async () => {
    const admin = await createUser({ role: 'admin' });
    const instructor = await createUser({ role: 'instructor', school: admin.school });

    const res = await request(app).delete(`/api/admin/instructors/${instructor._id}`)
      .set('Authorization', `Bearer ${getAuthToken(admin)}`);

    expect(res.status).toBe(200);
    expect(await User.findById(instructor._id)).toBeNull();
  });

  test("un chef ne peut pas gérer un formateur d'un autre établissement", async () => {
    const adminA = await createUser({ role: 'admin' });
    const schoolB = await createSchool();
    const instructorB = await createUser({ role: 'instructor', school: schoolB._id });

    const res = await request(app).delete(`/api/admin/instructors/${instructorB._id}`)
      .set('Authorization', `Bearer ${getAuthToken(adminA)}`);
    expect(res.status).toBe(404);

    expect(await User.findById(instructorB._id)).not.toBeNull();
  });
});
