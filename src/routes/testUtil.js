const { Role, DB } = require("../database/database");


async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}
exports.createAdminUser = createAdminUser;
function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
exports.randomName = randomName;
