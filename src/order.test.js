

jest.mock('./database/database.js', () => ({
  Role: {
    Admin: 'admin',
    Diner: 'diner',
  },
  DB: {
    getMenu: jest.fn(),
    addMenuItem: jest.fn(),
    createFranchise: jest.fn(),
    createStore: jest.fn(),
    addDinerOrder: jest.fn(),
  },
}));

let mockUser = null;
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

const request = require('supertest');
const app = require('./service');
const { DB, Role } = require('./database/database.js');

beforeEach(() => {
  mockUser = null;
  jest.clearAllMocks();
  global.fetch = undefined;
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













