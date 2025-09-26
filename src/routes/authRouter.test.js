const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('logoutValid', async ()=>{
  const loginResp = await request(app).put('/api/auth').send(testUser);

  const logoutRes = await request(app).delete('/api/auth').set('authorization',`Bearer ${loginResp.body.token}`).send();
  expect(logoutRes.status).toBe(200);
})

test('logoutInvalid',async ()=>{
  const loginResp = await request(app).put('/api/auth').send(testUser);

  const goodLogoutRes = await request(app).delete('/api/auth').set('authorization',`Bearer ${loginResp.body.token}`).send();
  expect(goodLogoutRes.status).toBe(200);

  const badLogoutRes = await request(app).delete('/api/auth').set('authorization',`Bearer ${loginResp.body.token}`).send();
  expect(badLogoutRes.status).toBe(401);
})

test('registerInvalid',async ()=>{
  const registerRes = await request(app).post('/api/auth').send({});
  expect(registerRes.status).toBe(400);
  expect(registerRes.body?.message).toBe('name, email, and password are required');
})

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}