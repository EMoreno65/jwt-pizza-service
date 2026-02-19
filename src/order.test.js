const { Role, DB } = require('./database/database.js');
const request = require('supertest');
const app = require('./service.js');

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
    createStore: jest.fn(),
    addDinerOrder: jest.fn(),
  },
}));

let mockUser;
jest.mock('./routes/authRouter.js', () => {
  const authRouter = (req, res, next) => next();
  authRouter.authenticateToken = (req, res, next) => {
    if (!mockUser) return res.status(401).json({ message: 'unauthorized' });
    req.user = mockUser;
    req.user.isRole = (role) => !!(req.user.roles || []).find((r) => r.role === role);
    next();
  }
    return {
    setAuthUser: (req, res, next) => {
      if (mockUser) req.user = mockUser;
      next();
    },
    authRouter,
  };
});

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

test('Get Menu', async () => {
  DB.getMenu.mockResolvedValue([
    { title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Good Pizza' },
    { title: 'Margarita', image: 'pizza3.png', price: 0.0042, description: 'Better Pizza' },
  ]);

  const res = await request(app).get('/api/order/menu');

  expect(res.status).toBe(200);
  expect(res.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: 'Pepperoni' }),
      expect.objectContaining({ title: 'Margarita' }),
    ])
  );
});

test('Add item as non admin', async () => {
    mockUser = { id: 2, roles: [{ role: Role.Diner }] };
    const res = await request(app)
      .put('/api/order/menu')
      .set('Authorization', 'Bearer fake')
      .send({ title: 'Nope', description: 'nope', image: 'x.png', price: 0.01 });   
    expect(res.status).toBe(403);
});

test('Add menu item as admin', async () => {
    mockUser = { id: 1, roles: [{ role: Role.Admin }] };
    const newItem = { title: 'Extra', description: 'good', image: 'pizza9.png', price: 0.0001 };
    DB.addMenuItem.mockResolvedValue({ ...newItem, id: 34});
    DB.getMenu.mockResolvedValue([{ ...newItem, id: 34 }]);

    const addRes = await request(app)
      .put('/api/order/menu')
      .set('Authorization', 'Bearer admin')
      .send(newItem);

    expect(addRes.status).toBe(200);
    expect(addRes.body).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Extra' })]));
})

test('Create Order', async () => {
    DB.addDinerOrder.mockResolvedValue({ id: 1, dinerId: 2, storeId: 3, items: [ { title: 'Pepperoni', quantity: 2 } ], total: 0.0084 });

    mockUser = { id: 2, roles: [{ role: Role.Diner }] };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ reportUrl: 'u', jwt: 'j' }) });

    const orderRes = await request(app)
      .post('/api/order')
      .set('Authorization', 'Bearer diner')
      .send({ storeId: 3, items: [ { menuItemId: 1, quantity: 2 } ] }); 
    if (orderRes.status !== 200) {
      console.log(orderRes.body);
    }
    expect(orderRes.status).toBe(200);
    expect(orderRes.body).toEqual(
      expect.objectContaining({
        order: expect.objectContaining({
          dinerId: 2,
          storeId: 3,
          items: expect.arrayContaining([expect.objectContaining({ title: 'Pepperoni', quantity: 2 })]),
          total: 0.0084,
        }),
        jwt: 'j',
        followLinkToEndChaos: 'u',
      })
    );
});



