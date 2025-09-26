const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { createAdminUser, randomName } = require('./testUtil.js');

let token;
let userLogin;

beforeAll(async ()=>{
    let baseUserInfo = await createAdminUser();
    let loginRes= await request(app).put('/api/auth').send(baseUserInfo);
    userLogin=loginRes.body.user;
    token = loginRes.body.token;


})


//ensures the router calls the database function properly
test("getAllFranchises",async ()=>{
    let dbCall={
        ...userLogin,
        isRole: ()=>true
    }
    let expectedFranchises = (await DB.getFranchises(dbCall))[0];

    const getFranchiseRes = await request(app).get(`/api/franchise/`).set('authorization',`Bearer ${token}`).send();
    expect(getFranchiseRes.status).toBe(200);

    expect(getFranchiseRes.body.franchises.length).toBe(expectedFranchises.length);
})

test("createFranchise", async ()=>{
  var { createFranchiseRes, franchiseData } = await createFranchise();
  expect(createFranchiseRes.status).toBe(200);

  expect(createFranchiseRes.body.id).toBeTruthy();//expect the franchise to exist
  expect(createFranchiseRes.body.admins).toStrictEqual(franchiseData.admins);
  expect(createFranchiseRes.body.name).toBe(franchiseData.name);


})

test("getUserFranchisesEmpty",async ()=>{
  let expectedFranchiseCount = (await DB.getUserFranchises(userLogin.id)).length;
  
  const getFranchiseRes = await request(app).get(`/api/franchise/${userLogin.id}`).set('authorization',`Bearer ${token}`).send();

  expect(getFranchiseRes.body.length).toBe(expectedFranchiseCount);
})

test("getUserFranchisesAdded",async ()=>{
  let expectedFranchiseCount = (await DB.getUserFranchises(userLogin.id)).length+1;

  await createFranchise();
  
  const getFranchiseRes = await request(app).get(`/api/franchise/${userLogin.id}`).set('authorization',`Bearer ${token}`).send();

  expect(getFranchiseRes.body.length).toBe(expectedFranchiseCount);
})

test("deleteUserFranchise", async()=>{
  let expectedFranchiseCount = (await DB.getUserFranchises(userLogin.id)).length;

  let {createFranchiseRes} = await createFranchise();

  const deleteFranchiseRes = await request(app).delete(`/api/franchise/${createFranchiseRes.body.id}`)
                                   .set('authorization',`Bearer ${token}`).send();
  
  expect(deleteFranchiseRes.status).toBe(200);

  let actualFranchiseCount = (await DB.getUserFranchises(userLogin.id)).length;

  expect(actualFranchiseCount).toBe(expectedFranchiseCount);
})

test("createStore", async()=>{
  let {createFranchiseRes} = await createFranchise();

  const storeData={
    name: randomName()
  }

  const franchiseId = createFranchiseRes.body.id;

  const expectedStoreCount = (await DB.getFranchise({id: franchiseId})).stores.length+1;

  const createStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`)
                                .set('authorization',`Bearer ${token}`).send(storeData);

   const actualStoreCount = (await DB.getFranchise({id: franchiseId})).stores.length;

  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.body.name).toBe(storeData.name);

  expect(actualStoreCount).toBe(expectedStoreCount);
})

test("deleteStore", async()=>{
  let {createFranchiseRes} = await createFranchise();

  const storeData={
    name: randomName()
  }

  const franchiseId = createFranchiseRes.body.id;

  const expectedStoreCount = (await DB.getFranchise({id: franchiseId})).stores.length;

  const createStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`)
                                .set('authorization',`Bearer ${token}`).send(storeData);

  const deleteStoreRes = await request(app).delete(`/api/franchise/${franchiseId}/store/${createStoreRes.body.id}`)
                                .set('authorization',`Bearer ${token}`).send();
  const actualStoreCount = (await DB.getFranchise({id: franchiseId})).stores.length;
  expect(deleteStoreRes.status).toBe(200);
  expect(actualStoreCount).toBe(expectedStoreCount);
})

//creates a franchise, returns the data used to create it and the actual response
async function createFranchise() {
  let franchiseData = {
    admins: [userLogin],
    name: randomName()
  };
  const createFranchiseRes = await request(app).post('/api/franchise').set('authorization', `Bearer ${token}`).send(franchiseData);
  return { createFranchiseRes, franchiseData };
}

