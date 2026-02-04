import { Router } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Nürburgring coordinates
const NURBURGRING_LAT = 50.3395;
const NURBURGRING_LON = 7.2678;

// Get weather data for a specific date
router.get('/:sessionId', async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    // Fetch the session from database to get the actual date
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Parse the session date
    const sessionDate = new Date(session.date);
    const year = sessionDate.getFullYear();
    const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
    const day = String(sessionDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const weatherResponse = await axios.get(
      `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${NURBURGRING_LAT}&longitude=${NURBURGRING_LON}&` +
      `start_date=${dateStr}&end_date=${dateStr}&` +
      `hourly=temperature_2m,precipitation,weather_code&` +
      `timezone=Europe/Berlin`
    );

    const hourlyData = weatherResponse.data.hourly;
    const weatherData = {
      date: dateStr,
      location: 'Nürburgring',
      hourly: hourlyData
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

export default router;
