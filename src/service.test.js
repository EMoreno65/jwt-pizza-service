const request = require('supertest');
const app = require('./service');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
};

function randomName() {
  return Math.random().toString(36).substring(2, 12);
};


jest.mock('./database/database.js', () => ({
  Role: {
    Admin: 'admin',
    Diner: 'diner',
  },
  DB: {
    addUser: jest.fn(),
    getMenu: jest.fn(),
    addMenuItem: jest.fn(),
    createFranchise: jest.fn(),
    deleteFranchise: jest.fn(),
    getFranchise: jest.fn(),
    getFranchises: jest.fn(),
    getUserFranchises: jest.fn(),
    createStore: jest.fn(),
    addDinerOrder: jest.fn(),
    deleteStore: jest.fn(),
  },
}));

jest.mock('./routes/authRouter.js', () => {
  return jest.requireActual('./routes/authRouter.js');
});

const { Role, DB } = require('./database/database.js');

beforeEach(async () => {
  jest.clearAllMocks();
  global.fetch = undefined;
  DB.addUser.mockImplementation(async (user) => ({
    id: 1,
    ...user,
  }));
  mockUser = await createAdminUser();
});

afterEach(() => {
  global.fetch = undefined;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(mockUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  const user = { ...mockUser, roles: [{ role: 'admin' }] };
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
});









































// const request = require('supertest');
// const app = require('./service');

// const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;
// let userId;

// beforeAll(async () => {
//   testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
//   const registerRes = await request(app).post('/api/auth').send(testUser);
//   testUserAuthToken = registerRes.body.token;
//   userId = registerRes.body.user.id;
// });

// test('login', async () => {
//   const loginRes = await request(app).put('/api/auth').send(testUser);
//   expect(loginRes.status).toBe(200);
//   expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

//   const user = { ...testUser, roles: [{ role: 'diner' }] };
//   delete user.password;
//   expect(loginRes.body.user).toMatchObject(user);
// });

// test('failed login', async () => {
//   const loginRes = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrong' });
//   expect(loginRes.status).toBe(404);
// });

// // test('Register user', async () => {
// //   const newUser = { name: 'new user', email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'a' };
// //   const registerRes = await request(app).post('/api/auth').send(newUser);
// //   expect(registerRes.status).toBe(200);
// // });

// test('Update a current user', async () => {
//   const UpdatedUser = { name: 'Updated User', email: 'somethingElse@test.com', password: 'b' };
//   const updateRes = await request(app)
//     .put(`/api/user/${userId}`)
//     .set('Authorization', `Bearer ${testUserAuthToken}`)
//     .send(UpdatedUser);
//   expect(updateRes.status).toBe(200); 
//   expect(updateRes.body.user).toMatchObject({ name: UpdatedUser.name, email: UpdatedUser.email });
// });

// test('Delete a user', async () => {
//   const deleteRes = await request(app)
//     .delete(`/api/user/${userId}`)
//     .set('Authorization', `Bearer ${testUserAuthToken}`);
//   expect(deleteRes.status).toBe(200); 
//   expect(deleteRes.body).toMatchObject({ message: 'not implemented' });
// });



// // Going to try to commit again because the last one didnt work for some reason