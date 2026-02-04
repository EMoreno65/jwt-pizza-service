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

let mockUser;

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
    getUser: jest.fn(),
    loginUser: jest.fn(),
    isLoggedIn: jest.fn(),
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
  DB.getUser.mockImplementation(async (email, password) => {
    if (email === mockUser.email && password === mockUser.password) {
      return { id: mockUser.id, name: mockUser.name, email: mockUser.email, roles: [{ role: Role.Admin }] };
    }
    return null;
  });

  DB.loginUser.mockImplementation(async (email, password) => {
    if (email === mockUser.email && password === mockUser.password) {
      return { id: mockUser.id, name: mockUser.name, email: mockUser.email, roles: [{ role: Role.Admin }] };
    }
    return null;
  });

  DB.isLoggedIn.mockResolvedValue(true);
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

test('failed login', async () => {
  const loginRes = await request(app).put('/api/auth').send({ email: mockUser.email, password: 'wrong' });
  expect(loginRes.status).toBe(500);
});

test('register a user', async () => {
  const newUser = { name: 'New User_' + Math.random(), email: 'newuser@example.com', password: 'password123' };
  const registerRes = await request(app).post('/api/auth').send(newUser);
  if (registerRes.status !== 200) {
    console.error(registerRes.body);
  }
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.user.email).toBe(newUser.email);
});