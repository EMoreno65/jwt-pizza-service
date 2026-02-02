const request = require('supertest');
const app = require('./service');
// const { DB } = require('./database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;

// const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
// let adminUserAuthToken;
// let userId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await request(app).post('/api/auth').send(testUser);
//   testUserAuthToken = registerRes.body.token;
  await request(app).put('/api/auth').send({ email: 'a@jwt.com', password: 'admin' });
//   adminUserAuthToken = adminLoginRes.body.token;
  await request(app).put('/api/auth').send(testUser);
});

test('Get all franchises', async () => {
    const res = await request(app).get('/api/franchise');
    expect(res.status).toBe(200);
    expect(res.body.franchises).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, name: 'pizzaPocket'})
    ]));
});