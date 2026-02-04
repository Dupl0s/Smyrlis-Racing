import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NLS_RACE_DATES: Record<string, string> = {
  NLS1: '2025-03-22',
  NLS2: '2025-04-26',
  NLS3: '2025-05-10',
  NLS4: '2025-05-24',
  NLS5: '2025-05-25',
  NLS6: '2025-08-16',
  NLS7: '2025-09-13',
  NLS8: '2025-09-14',
  NLS9: '2025-09-27',
  NLS10: '2025-10-11',
  'NLS-LIGHT': '2025-07-05'
};

const QUALI_START_HOUR = 9;
const RACE_START_HOUR = 12;

function normalizeNlsKey(name: string): string | null {
  if (/\bNLS\s*-?\s*LIGHT\b/i.test(name)) {
    return 'NLS-LIGHT';
  }

  const match = name.match(/\bNLS\s*(\d+)\b/i);
  if (match) {
    return `NLS${parseInt(match[1], 10)}`;
  }

  return null;
}

function buildSessionDate(nlsKey: string, type: 'QUALI' | 'RACE'): Date | null {
  const raceDate = NLS_RACE_DATES[nlsKey];
  if (!raceDate) {
    return null;
  }

  const baseDate = new Date(`${raceDate}T00:00:00`);
  const date = new Date(baseDate);

  if (type === 'QUALI') {
    date.setDate(date.getDate() - 1);
    date.setHours(QUALI_START_HOUR, 0, 0, 0);
  } else {
    date.setHours(RACE_START_HOUR, 0, 0, 0);
  }

  return date;
}

async function updateDates() {
  const sessions = await prisma.session.findMany();
  let updated = 0;

  for (const session of sessions) {
    const nlsKey = normalizeNlsKey(session.name);
    if (!nlsKey) {
      continue;
    }

    const type = session.type === 'QUALI' ? 'QUALI' : 'RACE';
    const newDate = buildSessionDate(nlsKey, type);
    if (!newDate) {
      continue;
    }

    const sameDay = session.date.toDateString() === newDate.toDateString();
    const sameTime = session.date.getHours() === newDate.getHours();

    if (!sameDay || !sameTime) {
      await prisma.session.update({
        where: { id: session.id },
        data: { date: newDate }
      });
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} session dates`);
}

updateDates()
  .catch((error) => {
    console.error('❌ Failed to update session dates:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });