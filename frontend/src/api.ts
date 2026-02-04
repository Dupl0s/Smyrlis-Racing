import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Session {
  id: string;
  name: string;
  type: string;
  date: string;
  _count: {
    results: number;
    laps: number;
  };
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  nation: string | null;
}

export interface Team {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  model: string;
  class: string;
  classShort: string | null;
}

export interface Result {
  id: string;
  startNumber: number;
  position: number;
  classPosition: number | null;
  totalLaps: number;
  bestLapTime: number;
  totalTime: string | null;
  gap: string | null;
  avgSpeed: number | null;
  driver: Driver;
  team: Team;
  vehicle: Vehicle;
}

export interface Lap {
  id: string;
  startNumber: number;
  lapNumber: number;
  lapTime: number;
  dayTime: string;
  isFastest: boolean;
  driver: Driver;
  team: Team;
  vehicle: Vehicle;
}

export interface SectorTime {
  id: string;
  startNumber: number;
  lapNumber: number;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  sector4: number | null;
  sector5: number | null;
  driver: Driver;
  vehicle: Vehicle;
}

export interface WeatherData {
  date: string;
  location: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
  };
}

export const sessionsApi = {
  getAll: () => api.get<Session[]>('/sessions'),
  getById: (id: string) => api.get<Session>(`/sessions/${id}`),
  getResults: (id: string) => api.get<Result[]>(`/sessions/${id}/results`),
  getLaps: (id: string, params?: { startNumber?: number; driverId?: string }) =>
    api.get<Lap[]>(`/sessions/${id}/laps`, { params }),
  getSectors: (id: string, params?: { startNumber?: number; driverId?: string }) =>
    api.get<SectorTime[]>(`/sessions/${id}/sectors`, { params }),
};

export const weatherApi = {
  getWeather: (sessionId: string) => api.get<WeatherData>(`/weather/${sessionId}`),
};

export const driversApi = {
  getAll: () => api.get<Driver[]>('/drivers'),
  getById: (id: string) => api.get<Driver>(`/drivers/${id}`),
  getStats: (id: string) => api.get(`/drivers/${id}/stats`),
};

export const teamsApi = {
  getAll: () => api.get<Team[]>('/teams'),
  getById: (id: string) => api.get<Team>(`/teams/${id}`),
};
