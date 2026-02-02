const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
// let userId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
//   userId = registerRes.body.user.id;
  await request(app).put('/api/auth').send(testUser);
//   const curr_user = loginRes.body.user;
});

test('Get Menu', async () => {
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body).toMatchObject([
        {
          id: 1,
          title: 'Pepperoni',
          image: 'pizza2.png',
          price: 0.0042,
          description: 'Spicy treat'
        },
        {
          id: 2,
          title: 'Margarita',
          image: 'pizza3.png',
          price: 0.0042,
          description: 'Essential classic'
        },
        {
          id: 3,
          title: 'Crusty',
          image: 'pizza4.png',
          price: 0.0028,
          description: 'A dry mouthed favorite'
        },
        {
          id: 4,
          title: 'Charred Leopard',
          image: 'pizza5.png',
          price: 0.0099,
          description: 'For those with a darker side'
        }
    ]);
});

test('Add Menu Item', async () => {
    const addMenuItemRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ title: 'ExtraPizza', description: 'Description with a lotta things', image: 'pizza9.png', price: 0.0001 });
})