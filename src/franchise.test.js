const request = require('supertest');
const app = require('./service');
// const { DB } = require('./database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;

let adminUserAuthToken;
// let testUserId;
let adminUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await request(app).post('/api/auth').send(testUser);
//   testUserId = registerRes.body.user.id;
  const adminLoginRes = await request(app).put('/api/auth').send({ email: 'a@jwt.com', password: 'admin' });
  adminUserId = adminLoginRes.body.user.id;
  await request(app).put('/api/auth').send(testUser);
  adminUserAuthToken = adminLoginRes.body.token;
});

test('Get all franchises', async () => {
    const res = await request(app).get('/api/franchise');
    expect(res.status).toBe(200);
    expect(res.body.franchises).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, name: 'pizzaPocket'})
    ]));
});

test('User creates franchise', async () => {
    const franchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({ name: 'TestFranchise' , admins: [{ email: 'a@jwt.com'}]});
    expect(franchiseRes.status).toBe(200);
})

test('Get user franchises', async () => {
    const userFranchisesRes = await request(app)
      .get(`/api/franchise/${adminUserId}`)
      .set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(userFranchisesRes.status).toBe(200);
    expect(userFranchisesRes.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'TestFranchise',
        admins: expect.arrayContaining([expect.objectContaining({ email: 'a@jwt.com' })])
      })
    ]));
});