const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findFirst()
  .then(u => { console.log('OK:', u?.username); return p.$disconnect(); })
  .catch(e => { console.log('ERROR:', e.message?.substring(0, 500)); console.log('CODE:', e.code); return p.$disconnect(); });
