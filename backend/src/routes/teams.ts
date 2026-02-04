import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all teams
router.get('/', async (_req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        results: {
          include: {
            session: true,
            driver: true,
            vehicle: true
          }
        }
      }
    });
    
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

export default router;
