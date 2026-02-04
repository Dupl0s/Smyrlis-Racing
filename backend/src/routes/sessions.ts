import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all sessions
router.get('/', async (_req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get session by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id }
    });
    
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Get session results
router.get('/:id/results', async (req, res): Promise<void> => {
  try {
    const results = await prisma.result.findMany({
      where: { sessionId: req.params.id },
      include: {
        driver: true,
        team: true,
        vehicle: true
      }
    });

    // Get all laps for this session to calculate final positions
    const laps = await prisma.lap.findMany({
      where: { sessionId: req.params.id }
    });

    // Find max lap number
    const maxLap = laps.length > 0 ? Math.max(...laps.map(l => l.lapNumber)) : 0;

    // Calculate final position based on last lap times for each start number
    const finalPositions = new Map<number, number>();
    
    if (maxLap > 0) {
      // Get the lap times for each team on the last lap
      const lastLapTimes = laps
        .filter(l => l.lapNumber === maxLap)
        .sort((a, b) => a.lapTime - b.lapTime)
        .map((l, index) => ({ startNumber: l.startNumber, position: index + 1 }));
      
      lastLapTimes.forEach(({ startNumber, position }) => {
        finalPositions.set(startNumber, position);
      });
    }

    const pitStops = await prisma.pitStop.findMany({
      where: { sessionId: req.params.id },
      select: { startNumber: true }
    });
    const pitCounts = new Map<number, number>();
    for (const pit of pitStops) {
      pitCounts.set(pit.startNumber, (pitCounts.get(pit.startNumber) || 0) + 1);
    }

    // Merge calculated final positions with results
    const resultsWithFinalPosition = results.map(result => ({
      ...result,
      position: finalPositions.get(result.startNumber) || result.position,
      pitStopCount: pitCounts.get(result.startNumber) || 0
    }));

    // Sort by final position
    resultsWithFinalPosition.sort((a, b) => (a.position || 999) - (b.position || 999));

    res.json(resultsWithFinalPosition);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get session laps
router.get('/:id/laps', async (req, res) => {
  try {
    const { startNumber, driverId } = req.query;
    
    const where: any = { sessionId: req.params.id };
    if (startNumber) where.startNumber = parseInt(startNumber as string);
    if (driverId) where.driverId = driverId;
    
    const laps = await prisma.lap.findMany({
      where,
      include: {
        driver: true,
        vehicle: true
      },
      orderBy: [
        { startNumber: 'asc' },
        { lapNumber: 'asc' }
      ]
    });

    const pitStops = await prisma.pitStop.findMany({
      where: { sessionId: req.params.id }
    });

    const pitMap = new Map<string, { inPit: boolean; duration: number | null }>();
    for (const pit of pitStops) {
      pitMap.set(`${pit.startNumber}-${pit.lapNumber}`, {
        inPit: true,
        duration: pit.duration ?? null
      });
    }

    const lapsWithPit = laps.map((lap) => {
      const pit = pitMap.get(`${lap.startNumber}-${lap.lapNumber}`);
      return {
        ...lap,
        inPit: pit?.inPit ?? false,
        pitDuration: pit?.duration ?? null
      };
    });

    res.json(lapsWithPit);
  } catch (error) {
    console.error('Error fetching laps:', error);
    res.status(500).json({ error: 'Failed to fetch laps' });
  }
});

// Get sector times
router.get('/:id/sectors', async (req, res) => {
  try {
    const { startNumber, driverId } = req.query;
    
    const where: any = { sessionId: req.params.id };
    if (startNumber) where.startNumber = parseInt(startNumber as string);
    if (driverId) where.driverId = driverId;
    
    const sectorTimes = await prisma.sectorTime.findMany({
      where,
      include: {
        driver: true,
        vehicle: true
      },
      orderBy: [
        { startNumber: 'asc' },
        { lapNumber: 'asc' }
      ]
    });
    res.json(sectorTimes);
  } catch (error) {
    console.error('Error fetching sector times:', error);
    res.status(500).json({ error: 'Failed to fetch sector times' });
  }
});

export default router;
