

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













