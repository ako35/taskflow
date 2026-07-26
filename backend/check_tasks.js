const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const tasks = await prisma.task.findMany();
    console.log('FOUND', tasks.length, 'tasks');
    tasks.forEach(t => console.log(JSON.stringify({id:t.id,title:t.title,priority:t.priority,status:t.status,ownerEmail:t.ownerEmail}, null, 2)));
  } catch (e) {
    console.error('PRISMA_ERROR', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
