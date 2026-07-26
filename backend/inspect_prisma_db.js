const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const tasks = await prisma.task.findMany();
    console.log('FOUND', tasks.length, 'tasks');
    if (tasks.length) console.log(JSON.stringify(tasks.map(t => ({id:t.id,title:t.title,status:t.status,ownerEmail:t.ownerEmail})), null, 2));
  } catch (e) {
    console.error('PRISMA_ERR', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
