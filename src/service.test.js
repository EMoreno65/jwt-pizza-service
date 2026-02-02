
const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await request(app).post('/api/auth').send(testUser);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const user = { ...testUser, roles: [{ role: 'diner' }] };
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
});

test('failed login', async () => {
  const loginRes = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrong' });
  expect(loginRes.status).toBe(404);
});

test('Register user', async () => {
  const newUser = { name: 'new user', email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'a' };
  const registerRes = await request(app).post('/api/auth').send(newUser);
  expect(registerRes.status).toBe(200);
});

test('Update a current user', async () => {
  const UpdatedUser = { name: 'Updated User', email: 'somethingElse@test.com', password: 'b' };
  const UpdateRes = ((await request(app).put('/api/auth/:userId')).send(UpdatedUser));
  expect(UpdateRes.status).toBe(200); 
  expect(UpdateRes.body.user).toMatchObject(UpdatedUser);
})