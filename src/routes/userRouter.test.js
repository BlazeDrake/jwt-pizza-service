const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { randomName } = require('./testUtil.js');



test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  const [user, userToken] = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get(`/api/user?page=1&limit=10&name=${user.name}`)
    .set('Authorization', 'Bearer ' + userToken);
  expect(listUsersRes.status).toBe(200);
});

test('update user',async ()=>{
    const [user, userToken] = await registerUser(request(app));

    const updateUserReq={
        name: 'updated pizza diner',
        email: `${randomName()}@test.com`,
        password: 'a',
    }
    const updateUserRes = await request(app)
        .put(`/api/user/${user.id}`)
        .set('Authorization', 'Bearer ' + userToken)
        .send(updateUserReq);

    expect(updateUserRes.status).toBe(200);

    let dbUser=await DB.getUser(updateUserReq.email,updateUserReq.password);
    expect(dbUser.name).toBe(updateUserReq.name)
})

async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}