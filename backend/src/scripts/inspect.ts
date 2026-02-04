import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  // Find qualifying session
  const qualiSession = await prisma.session.findFirst({
    where: { type: 'QUALI' }
  });

  if (!qualiSession) {
    console.log('No QUALI session found');
    return;
  }

  // Get all results for QUALI
  const results = await prisma.result.findMany({
    where: { sessionId: qualiSession.id },
    include: { driver: true, team: true, vehicle: true },
    orderBy: [{ position: 'asc' }, { startNumber: 'asc' }]
  });

  console.log(`\n📊 Total Results in QUALI: ${results.length}\n`);
  
  // Show first 15 results
  results.slice(0, 15).forEach((r) => {
    console.log(`Pos ${r.position} | #${r.startNumber} | Driver: ${r.driver.firstName} ${r.driver.lastName} | Team: ${r.team.name}`);
  });

  // Check for duplicates
  console.log('\n🔍 Checking for duplicate positions:\n');
  const positionCounts = new Map<number, number>();
  results.forEach((r) => {
    if (r.position !== null) {
      const count = positionCounts.get(r.position) || 0;
      positionCounts.set(r.position, count + 1);
    }
  });

  Array.from(positionCounts.entries())
    .filter(([_pos, count]) => count > 1)
    .forEach(([pos, count]) => {
      console.log(`Position ${pos} appears ${count} times!`);
      const posResults = results.filter((r) => r.position === pos);
      posResults.forEach((r) => {
        console.log(`  - #${r.startNumber} ${r.driver.firstName} ${r.driver.lastName} (${r.team.name})`);
      });
    });
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
