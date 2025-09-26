const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database.js');
const { randomName, createAdminUser } = require('./testUtil.js');

const testUserBase = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let registeredUser;
let testUserAuthToken;

beforeAll(async () => {
  testUserBase.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUserBase);

  registeredUser = registerRes.body.user;

  let loginRes= await request(app).put('/api/auth').send(testUserBase);

  testUserAuthToken = loginRes.body.token;
});

test('getMenu', async()=>{
    const getMenuRes = await sendEmptyReq('/api/order/menu')
    let expected=await DB.getMenu();

    expect(getMenuRes.status).toBe(200);

    expect(getMenuRes.body).toStrictEqual(expected);
})

test('addMenuOptionValid', async()=>{
    let baseUserInfo = await createAdminUser();
    let loginRes= await request(app).put('/api/auth').send(baseUserInfo);
    let adminToken = loginRes.body.token;

    const itemName = randomName();
    let itemToAdd = {
        title: itemName,
        description: "test",
        price: 0.99,
        image: "test"
    }

    let oldMenu = (await DB.getMenu());

    let createMenuRes = await request(app).put('/api/order/menu/').set('authorization',`Bearer ${adminToken}`).send(itemToAdd);

    expect(createMenuRes.status).toBe(200)
    
    let newMenu = await DB.getMenu();

    expect(newMenu.length).toBe(oldMenu.length+1);
    const hasItem = newMenu.some(item => item.title === itemName)
    expect(hasItem).toBe(true)
})

test('addMenuOptionInvalid', async()=>{
    let createMenuRes = await request(app).put('/api/order/menu/').set('authorization',`Bearer ${testUserAuthToken}`).send();
    expect(createMenuRes.status).toBe(403);
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