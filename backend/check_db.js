const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const tasks = await prisma.task.findMany();
    console.log('FOUND', tasks.length, 'tasks');
    if (tasks.length) console.log(tasks.map(t => ({id:t.id,title:t.title,status:t.status})));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
