const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const r = await db.dailyRecord.count();
  const t = await db.trip.count();
  const e = await db.expense.count();
  console.log('Records:', r, 'Trips:', t, 'Expenses:', e);
  const recs = await db.dailyRecord.findMany({ take: 30, include: { trips: true, expenses: true }, orderBy: { date: 'desc' } });
  const json = JSON.stringify(recs);
  console.log('Payload 30 records:', (json.length / 1024 / 1024).toFixed(2), 'MB');
  const recs10 = await db.dailyRecord.findMany({ take: 10, include: { trips: true, expenses: true }, orderBy: { date: 'desc' } });
  const json10 = JSON.stringify(recs10);
  console.log('Payload 10 records:', (json10.length / 1024 / 1024).toFixed(2), 'MB');
  await db.$disconnect();
})();
