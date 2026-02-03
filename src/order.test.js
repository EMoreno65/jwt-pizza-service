

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











