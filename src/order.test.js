const request = require('supertest');
const app = require('./service');
const { DB } = require('./database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

// const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let adminUserAuthToken;
// let userId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  // Login as the built-in admin user (created during DB initialization)
  const adminLoginRes = await request(app).put('/api/auth').send({ email: 'a@jwt.com', password: 'admin' });
  adminUserAuthToken = adminLoginRes.body.token;
  await request(app).put('/api/auth').send(testUser);
});

test('Get Menu', async () => {
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' }),
      expect.objectContaining({ title: 'Margarita', image: 'pizza3.png', price: 0.0042, description: 'Essential classic' }),
      expect.objectContaining({ title: 'Crusty', image: 'pizza4.png', price: 0.0028, description: 'A dry mouthed favorite' }),
      expect.objectContaining({ title: 'Charred Leopard', image: 'pizza5.png', price: 0.0099, description: 'For those with a darker side' }),
    ]));
});

test('Try to add Menu Item as non-admin', async () => {
    const addMenuItemRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ title: 'ExtraPizza', description: 'Description with a lotta things', image: 'pizza9.png', price: 0.0001 });
    expect(addMenuItemRes.status).toBe(403);
    console.log(addMenuItemRes.body);
});

test('Try to add Menu Item as admin', async () => {
    const title = 'ExtraPizza_' + Math.random().toString(36).substring(2, 8);
    const addMenuItemRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send({ title, description: 'Description with a lotta things', image: 'pizza9.png', price: 0.0001 });
    expect(addMenuItemRes.status).toBe(200);

    // verify the menu contains the new item
    expect(addMenuItemRes.body).toEqual(expect.arrayContaining([expect.objectContaining({ title })]));

    // cleanup: remove the created menu item so tests stay idempotent
    const created = addMenuItemRes.body.find((m) => m.title === title);
    if (created) {
      const conn = await DB.getConnection();
      await DB.query(conn, 'DELETE FROM menu WHERE id=?', [created.id]);
      conn.end();
    }
});