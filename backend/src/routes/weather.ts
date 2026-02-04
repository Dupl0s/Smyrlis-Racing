import { Router } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Nürburgring area points (north, east, south, west)
const WEATHER_POINTS = [
  { name: 'Nord', latitude: 50.3700, longitude: 7.2678 },
  { name: 'Ost', latitude: 50.3395, longitude: 7.3200 },
  { name: 'Sued', latitude: 50.3100, longitude: 7.2678 },
  { name: 'West', latitude: 50.3395, longitude: 7.2200 }
];
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

    const sessionStartMinutes = session.type === 'QUALI'
      ? QUALI_START_HOUR * 60
      : RACE_START_HOUR * 60;

    const weatherResponses = await Promise.all(
      WEATHER_POINTS.map((point) =>
        axios.get(
          `https://archive-api.open-meteo.com/v1/archive?` +
          `latitude=${point.latitude}&longitude=${point.longitude}&` +
          `start_date=${dateStr}&end_date=${dateStr}&` +
          `hourly=temperature_2m,precipitation,weather_code&` +
          `timezone=Europe/Berlin`
        )
      )
    );

    const hourlyByPoint = weatherResponses.map((response) => response.data.hourly);
    const baseHourly = hourlyByPoint[0] || { time: [], temperature_2m: [], precipitation: [], weather_code: [] };
    const hourlyTimes = (baseHourly.time || []).map(toTimeOnly);
    const hourlyMinutes = hourlyTimes.map(timeToMinutes);

    const averageAtIndex = (key: 'temperature_2m' | 'precipitation', index: number): number | null => {
      let total = 0;
      let count = 0;
      for (const hourly of hourlyByPoint) {
        const values = hourly?.[key];
        const value = values ? values[index] : null;
        if (typeof value === 'number') {
          total += value;
          count++;
        }
      }
      return count > 0 ? total / count : null;
    };

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
    const lapWeather = lapNumbers.map((lapNumber) => {
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

      const perPoint = WEATHER_POINTS.map((point, pointIndex) => {
        const hourly = hourlyByPoint[pointIndex];
        return {
          name: point.name,
          temperature: hourly?.temperature_2m ? hourly.temperature_2m[closestIndex] : null,
          precipitation: hourly?.precipitation ? hourly.precipitation[closestIndex] : null,
          weather_code: hourly?.weather_code ? hourly.weather_code[closestIndex] : null
        };
      });

      return {
        lapNumber,
        time: hourlyTimes[closestIndex] || null,
        temperature: averageAtIndex('temperature_2m', closestIndex),
        precipitation: averageAtIndex('precipitation', closestIndex),
        weather_code: baseHourly.weather_code ? baseHourly.weather_code[closestIndex] : null,
        perPoint
      };
    });

    const averagedHourly = {
      time: hourlyTimes,
      temperature_2m: hourlyTimes.map((_: string, index: number) => averageAtIndex('temperature_2m', index)),
      precipitation: hourlyTimes.map((_: string, index: number) => averageAtIndex('precipitation', index)),
      weather_code: baseHourly.weather_code || []
    };
    const weatherData = {
      date: dateStr,
      location: 'Nürburgring',
      points: WEATHER_POINTS,
      hourly: averagedHourly,
      lapWeather
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

export default router;
