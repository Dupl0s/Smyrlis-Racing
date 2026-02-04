import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

export default router;
