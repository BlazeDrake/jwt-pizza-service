const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { randomName, createAdminUser } = require('./testUtil.js');



test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');

  expect(listUsersRes.status).toBe(401);
});

test('list users default', async () => {
  const [listUsersRes,dbUsers] = await testGetUsers();
  expect(listUsersRes.body.users?.length).toBe(dbUsers.length);
});

test('list users with page offset', async ()=>{
  const [listUsersRes,dbUsers] = await testGetUsers(1);
  expect(listUsersRes.body.users?.length).toBe(dbUsers.length);
  expect(listUsersRes.body.users[0]?.email).toBe(dbUsers[0]?.email)
})

test('list users with name filter', async ()=>{
  const [listUsersRes,dbUsers] = await testGetUsers(undefined,99999,'a');
  expect(listUsersRes.body.users?.length).toBe(dbUsers.length);
  expect(listUsersRes.body.users[0]?.email).toBe(dbUsers[0]?.email)
})

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

test('delete user unauthorized', async () => {
  const deleteUserRes = await request(app).delete('/api/user/1');

  expect(deleteUserRes.status).toBe(401);
});

test('delete user not admin', async () => {

  const testUserBase = (await registerUser(request(app)))[0];

  const loginRes= await request(app).put('/api/auth').send(testUserBase);

  let testUserAuthToken = loginRes.body.token;

  const deleteUserRes = await request(app).delete('/api/user/1').set('authorization',`Bearer ${testUserAuthToken}`);

  expect(deleteUserRes.status).toBe(403);
});

test('delete user valid', async ()=>{
    const user = await createAdminUser();
    const loginRes= await request(app).put('/api/auth').send(user);
    const token = loginRes.body.token;

    let deletedUser = (await registerUser(request(app)))[0]

    //ensure the user does exist before deletion
    const userExists= await DB.getUser(deletedUser.email,deletedUser.password)

    expect(userExists?.id).toBe(deletedUser.id)

    const deleteUserRes = await request(app).delete(`/api/user/${deletedUser.id}`).set('authorization',`Bearer ${token}`);

    expect(deleteUserRes.status).toBe(200);
    await expect(DB.getUser(deletedUser.email,deletedUser.password)).rejects.toThrow('unknown user');
  })



async function testGetUsers(page=undefined,limit=undefined,name=undefined){
  const user = await createAdminUser();
  const loginRes= await request(app).put('/api/auth').send(user);
  const token = loginRes.body.token;
  let query ='';
  if(page){
    query+=`page=${page}&`
  }
  if(limit){
    query+=`limit=${limit}&`
  }
  if(name){
    query+=`name=${name}`
  }
  if(query.endsWith('&')){
    query=query.slice(0,query.length-1)
  }

  const dbUsers= (await DB.listUsers(page,limit,name))[0];

  const listUsersRes = await request(app)
    .get(`/api/user?${query}`)
    .set('Authorization', 'Bearer ' + token);
  expect(listUsersRes.status).toBe(200);

  return [listUsersRes,dbUsers];
}

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