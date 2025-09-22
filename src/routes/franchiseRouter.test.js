const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let token;
let userLogin;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}



beforeAll(async ()=>{
    let baseUserInfo = await createAdminUser();
    let loginRes= await request(app).put('/api/auth').send(baseUserInfo);
    userLogin=loginRes.body.user;
    token = loginRes.body.token;
})


//ensures the router calls the database function properly
test("getAllFranchises",async ()=>{
    let getFranchiseBody={
        user: userLogin
    }
    let dbCall={
        ...userLogin,
        isRole: ()=>true
    }
    let expectedFranchises = (await DB.getFranchises(dbCall))[0];

    const getFranchiseRes = await request(app).get(`/api/franchise/`).set('authorization',`Bearer ${token}`).send();
    expect(getFranchiseRes.status).toBe(200);

    expect(getFranchiseRes.body.franchises.length).toBe(expectedFranchises.length);
})
