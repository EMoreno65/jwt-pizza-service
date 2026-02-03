const request = require('supertest');
const app = require('./service');
// const { DB } = require('./database/database.js');

const { Role, DB } = require('./database/database.js');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;

let adminUserAuthToken;
// let testUserId;
let adminUserId;
let createdFranchiseId;
let adminUser;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await request(app).post('/api/auth').send(testUser);
//   testUserId = registerRes.body.user.id;
  adminUser = await createAdminUser();
  console.log(adminUser);
  adminUserId = adminUser.id;
  await request(app).put('/api/auth').send(testUser);
  const adminRes = await request(app).put('/api/auth').send(adminUser);
  adminUserAuthToken = adminRes.body.token;
});

test('Get all franchises', async () => {
    const newName = 'newPizza_' + Math.random().toString(36).substring(2, 8);
    const nameAddedRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminUserAuthToken}`)
      .send({ name: newName, admins: [{ email: adminUser.email }] });
    expect(nameAddedRes.status).toBe(200);
    const res = await request(app).get('/api/franchise');
    expect(res.status).toBe(200);
    expect(res.body.franchises).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: newName })
    ]));
});

test('User creates franchise', async () => {
    const name = 'TestFranchise_' + Math.random().toString(36).substring(2, 8);
    const franchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminUserAuthToken}`)
      .send({ name, admins: [{ email: adminUser.email }] });
    // console.log(franchiseRes.body);
    // if (franchiseRes.status !== 200) {
    //   console.error('FRANCHISE CREATE FAILED:', franchiseRes.status, franchiseRes.body);
    // }
    expect(franchiseRes.status).toBe(200);
    createdFranchiseId = franchiseRes.body.id;
});

test('Get user franchises', async () => {
    const listName = 'TestFranchise_' + Math.random().toString(36).substring(2, 8);
    await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminUserAuthToken}`)
      .send({ name: listName, admins: [{ email: adminUser.email}]});
    const userFranchisesRes = await request(app)
      .get(`/api/franchise/${adminUserId}`)
      .set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(userFranchisesRes.status).toBe(200);
    expect(userFranchisesRes.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: listName,
        admins: expect.arrayContaining([expect.objectContaining({ email: adminUser.email })])
      })
    ]));
});

afterAll(async () => {
  if (createdFranchiseId) {
    await request(app)
      .delete(`/api/franchise/${createdFranchiseId}`)
      .set('Authorization', `Bearer ${adminUserAuthToken}`);
  }
});