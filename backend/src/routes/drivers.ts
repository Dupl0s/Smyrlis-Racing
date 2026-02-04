import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

const NURBURGRING_LAT = 50.3395;
const NURBURGRING_LON = 7.2678;
const QUALI_START_HOUR = 9;
const RACE_START_HOUR = 12;

const toTimeOnly = (timeStr: string): string => {
  if (timeStr.includes('T')) {
    const [, timePart] = timeStr.split('T');
    return timePart.slice(0, 5);
  }
  return timeStr.slice(0, 5);
};

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

async function getSessionLapWeather(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return null;
  }

  const sessionDate = new Date(session.date);
  const year = sessionDate.getFullYear();
  const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
  const day = String(sessionDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const sessionStartMinutes = session.type === 'QUALI'
    ? QUALI_START_HOUR * 60
    : RACE_START_HOUR * 60;

  const weatherResponse = await axios.get(
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${NURBURGRING_LAT}&longitude=${NURBURGRING_LON}&` +
    `start_date=${dateStr}&end_date=${dateStr}&` +
    `hourly=temperature_2m,precipitation,weather_code&` +
    `timezone=Europe/Berlin`
  );

  const hourlyData = weatherResponse.data.hourly;
  const hourlyTimes = (hourlyData.time || []).map(toTimeOnly);
  const hourlyMinutes = hourlyTimes.map(timeToMinutes);

  const laps = await prisma.lap.findMany({
    where: { sessionId },
    select: { lapNumber: true, lapTime: true }
  });

  const lapGroups = new Map<number, { total: number; count: number }>();
  for (const lap of laps) {
    const current = lapGroups.get(lap.lapNumber) || { total: 0, count: 0 };
    current.total += lap.lapTime;
    current.count += 1;
    lapGroups.set(lap.lapNumber, current);
  }

  const lapNumbers = Array.from(lapGroups.keys()).sort((a, b) => a - b);
  let cumulativeMinutes = 0;
  const lapWeather = new Map<number, { precipitation: number | null }>();

  for (const lapNumber of lapNumbers) {
    const group = lapGroups.get(lapNumber);
    const avgLapSeconds = group ? group.total / group.count : 0;
    cumulativeMinutes += avgLapSeconds / 60;
    const estimatedMinutes = sessionStartMinutes + cumulativeMinutes;

    let closestIndex = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < hourlyMinutes.length; i++) {
      const diff = Math.abs(hourlyMinutes[i] - estimatedMinutes);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    lapWeather.set(lapNumber, {
      precipitation: hourlyData.precipitation ? hourlyData.precipitation[closestIndex] : null
    });
  }

  return lapWeather;
}

// Get all drivers
router.get('/', async (_req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { lastName: 'asc' }
    });
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get driver by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        results: {
          include: {
            session: true,
            team: true,
            vehicle: true
          }
        }
      }
    });
    
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    
    res.json(driver);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Get driver statistics
router.get('/:id/stats', async (req, res): Promise<void> => {
  try {
    const laps = await prisma.lap.findMany({
      where: { driverId: req.params.id },
      orderBy: { lapTime: 'asc' }
    });
    
    if (laps.length === 0) {
      res.json({
        totalLaps: 0,
        bestLap: null,
        avgLapTime: null,
        consistency: null
      });
    }
    
    const totalLaps = laps.length;
    const bestLap = laps[0].lapTime;
    const avgLapTime = laps.reduce((sum, lap) => sum + lap.lapTime, 0) / totalLaps;
    
    // Calculate standard deviation for consistency
    const variance = laps.reduce((sum, lap) => 
      sum + Math.pow(lap.lapTime - avgLapTime, 2), 0) / totalLaps;
    const consistency = Math.sqrt(variance);
    
    res.json({
      totalLaps,
      bestLap,
      avgLapTime,
      consistency,
      fastestLaps: laps.length
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ error: 'Failed to fetch driver statistics' });
  }
});

// Driver search stats with wet/dry averages (top 3% fastest laps)
router.get('/:id/avg-laps', async (req, res): Promise<void> => {
  try {
    const percent = Math.max(1, Math.min(10, parseFloat((req.query.percent as string) || '3')));
    const driverId = req.params.id;

    const laps = await prisma.lap.findMany({
      where: { driverId },
      select: { lapNumber: true, lapTime: true, sessionId: true }
    });

    if (laps.length === 0) {
      res.json({
        percent,
        dry: { avgLapTime: null, lapCount: 0 },
        wet: { avgLapTime: null, lapCount: 0 }
      });
      return;
    }

    const sessions = Array.from(new Set(laps.map((lap) => lap.sessionId)));
    const weatherMaps = new Map<string, Map<number, { precipitation: number | null }>>();

    for (const sessionId of sessions) {
      const map = await getSessionLapWeather(sessionId);
      if (map) {
        weatherMaps.set(sessionId, map);
      }
    }

    const wetLaps: number[] = [];
    const dryLaps: number[] = [];

    for (const lap of laps) {
      const weatherMap = weatherMaps.get(lap.sessionId);
      const weather = weatherMap?.get(lap.lapNumber);
      const precipitation = weather?.precipitation ?? 0;

      if (precipitation > 0.1) {
        wetLaps.push(lap.lapTime);
      } else {
        dryLaps.push(lap.lapTime);
      }
    }

    const avgTopPercent = (times: number[]) => {
      if (times.length === 0) return null;
      const sorted = [...times].sort((a, b) => a - b);
      const count = Math.max(1, Math.ceil((sorted.length * percent) / 100));
      const slice = sorted.slice(0, count);
      return slice.reduce((sum, time) => sum + time, 0) / slice.length;
    };

    res.json({
      percent,
      dry: {
        avgLapTime: avgTopPercent(dryLaps),
        lapCount: dryLaps.length
      },
      wet: {
        avgLapTime: avgTopPercent(wetLaps),
        lapCount: wetLaps.length
      }
    });
  } catch (error) {
    console.error('Error fetching driver avg laps:', error);
    res.status(500).json({ error: 'Failed to fetch driver averages' });
  }
});

export default router;
