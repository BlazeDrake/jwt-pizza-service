const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');
const { randomName } = require('./testUtil.js');

const testUserBase = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let registeredUser;
let testUserAuthToken;
let loggedInUser;

beforeAll(async () => {
  testUserBase.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUserBase);

  registeredUser = registerRes.body.user;

  let loginRes= await request(app).put('/api/auth').send(testUserBase);

  testUserAuthToken = loginRes.body.token;
  loggedInUser = loginRes.body.user;
});

test('getMenu', async()=>{
    const getMenuRes = await sendEmptyReq('/api/order/menu')
    let expected=await DB.getMenu();

    expect(getMenuRes.status).toBe(200);

    expect(getMenuRes.body).toStrictEqual(expected);
})

test('createOrder',async()=>{
    
    let menu = await DB.getMenu();

    let orderData = {
        franchiseId: 0,
        storeId: 0,
        items:[
            {
                menuId: menu[0].id,
                description: "test",
                price: 0.99
            }
        ]
    }

    let createOrderRes = await request(app).post('/api/order/').set('authorization',`Bearer ${testUserAuthToken}`).send(orderData);
    
    expect(createOrderRes.status).toBe(200);
    expect(createOrderRes.body.order.franchiseId).toBe(orderData.franchiseId)
    expect(createOrderRes.body.order.items.length).toBe(orderData.items.length)
},1000000000)

test('getOrders',async()=>{
    const getOrdersRes = await sendEmptyReq('/api/order')

    expect(getOrdersRes.status).toBe(200)

    let expected=await DB.getOrders(registeredUser);

    expect(getOrdersRes.body.dinerId).toBe(expected.dinerId)
    expect(getOrdersRes.body.orders.length).toBe(expected.orders.length)
})

async function sendEmptyReq(uri){
    return request(app).get(uri).set('authorization',`Bearer ${testUserAuthToken}`).send();
}