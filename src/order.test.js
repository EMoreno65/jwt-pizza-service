const request = require('supertest');
const app = require('./service');

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
let testUserAuthToken;

// const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let adminUserAuthToken;
// let userId;

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
    expect(addMenuItemRes.status).toBe(401);
});

test('Try to add Menu Item as admin', async () => {
    const title = 'ExtraPizza_' + Math.random().toString(36).substring(2, 8);
    const addMenuItemRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send({ title, description: 'Description with a lotta things', image: 'pizza9.png', price: 0.0001 });
    expect(addMenuItemRes.status).toBe(200);

    expect(addMenuItemRes.body).toEqual(expect.arrayContaining([expect.objectContaining({ title })]));

    const created = addMenuItemRes.body.find((m) => m.title === title);
    if (created) {
      const conn = await DB.getConnection();
      await DB.query(conn, 'DELETE FROM menu WHERE id=?', [created.id]);
      conn.end();
    }
});

test('Create order', async () => {
    const orderRes = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'TestingNewPizza', price: 0.05 }] });
    console.log(orderRes.body);
    if (orderRes.status !== 200) {
        console.error('ORDER CREATE FAILED:', orderRes.status, orderRes.body);
    }
    expect(orderRes.status).toBe(200);
    expect(orderRes.body).toMatchObject({
        order: {
            franchiseId: 1,
            storeId: 1,
            items: [{ menuId: 1, description: 'TestingNewPizza', price: 0.05 }],
        },
    });
})