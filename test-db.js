const { prisma: p } = require('./app/lib/prisma');
p.user.findFirst()
  .then(u => { console.log('OK:', u?.username); return p.$disconnect(); })
  .catch(e => { console.log('ERROR:', e.message?.substring(0, 500)); console.log('CODE:', e.code); return p.$disconnect(); });
