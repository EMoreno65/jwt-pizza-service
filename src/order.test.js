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
let adminUser;
let testUserAuthToken;

// const adminUser = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let adminUserAuthToken;
// let userId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const testUserRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = testUserRes.body.token;
//   testUserId = registerRes.body.user.id;
  adminUser = await createAdminUser();
  console.log(adminUser);
  await request(app).put('/api/auth').send(testUser);
  const adminRes = await request(app).put('/api/auth').send(adminUser);
  adminUserAuthToken = adminRes.body.token;
});

test('Get Menu', async () => {
    const original_items = [
      expect.objectContaining({ title: 'Pepperoni ' + Math.random().toString(36).substring(2, 8), image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' }),
      expect.objectContaining({ title: 'Margarita', image: 'pizza3.png', price: 0.0042, description: 'Essential classic' }),
      expect.objectContaining({ title: 'Crusty', image: 'pizza4.png', price: 0.0028, description: 'A dry mouthed favorite' }),
      expect.objectContaining({ title: 'Charred Leopard', image: 'pizza5.png', price: 0.0099, description: 'For those with a darker side' }),
    ];

    const matchers = original_items.map(i => expect.objectContaining(i));

    for (const item of original_items) {
        let addMenuItemRes = await request(app)
            .put('/api/order/menu')
            .set('Authorization', `Bearer ${adminUserAuthToken}`)
            .send(item);
        expect(addMenuItemRes.status).toBe(200);
    };

    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body).toEqual(
        expect.arrayContaining(matchers)
    );
});

test('Try to add Menu Item as non-admin', async () => {
    const addMenuItemRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ title: 'ExtraPizza', description: 'Description with a lotta things', image: 'pizza9.png', price: 0.0001 });
    expect(addMenuItemRes.status).toBe(403);
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
  const franchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({
      name: 'OrderTest_' + randomName(),
      admins: [{ email: adminUser.email }],
    });

  const franchiseId = franchiseRes.body.id;

  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({ name: 'Main Store' });

  const storeId = storeRes.body.id;

  const menuRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({
      title: 'OrderPizza_' + randomName(),
      description: 'Order test',
      image: 'pizza.png',
      price: 0.05,
    });

  const menuId = menuRes.body.at(-1).id;

  const orderRes = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({
      franchiseId,
      storeId,
      items: [{ menuId, description: 'TestingNewPizza', price: 0.05 }],
    });

  expect(orderRes.status).toBe(200);
});
