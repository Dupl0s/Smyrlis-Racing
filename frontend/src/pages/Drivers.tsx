import { useEffect, useState } from 'react';
import { driversApi, Driver } from '../api';

function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [avgStats, setAvgStats] = useState<{ dry: number | null; wet: number | null; percent: number } | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await driversApi.getAll();
        setDrivers(response.data);
      } catch (err) {
        setError('Failed to load drivers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  if (loading) return <div className="loading">Loading drivers...</div>;
  if (error) return <div className="error">{error}</div>;

  const filteredDrivers = drivers.filter((driver) => {
    if (!query.trim()) return true;
    const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase();
    return fullName.includes(query.toLowerCase());
  });

  const formatTime = (seconds: number | null | undefined) => {
    if (!seconds || seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const handleSelectDriver = async (driver: Driver) => {
    setSelectedDriver(driver);
    try {
      const res = await driversApi.getAvgLaps(driver.id, 3);
      setAvgStats({
        dry: res.data?.dry?.avgLapTime ?? null,
        wet: res.data?.wet?.avgLapTime ?? null,
        percent: res.data?.percent ?? 3
      });
    } catch (err) {
      console.error(err);
      setAvgStats({ dry: null, wet: null, percent: 3 });
    }
  };

  return (
    <div>
      <h2>Drivers</h2>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Search Driver</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing a driver name..."
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {selectedDriver && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{selectedDriver.firstName} {selectedDriver.lastName}</h3>
          <p style={{ color: '#888', marginBottom: '1rem' }}>
            Top {avgStats?.percent ?? 3}% fastest laps
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', padding: '1rem', background: '#1f1f1f', borderRadius: '8px' }}>
              <strong>Dry Avg</strong>
              <div style={{ fontSize: '1.2rem' }}>{formatTime(avgStats?.dry)}</div>
            </div>
            <div style={{ flex: '1 1 200px', padding: '1rem', background: '#1f1f1f', borderRadius: '8px' }}>
              <strong>Wet Avg</strong>
              <div style={{ fontSize: '1.2rem' }}>{formatTime(avgStats?.wet)}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Nation</th>
              <th>Results</th>
              <th>Laps</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((driver: any) => (
              <tr key={driver.id}>
                <td>
                  <button
                    onClick={() => handleSelectDriver(driver)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    {driver.firstName} {driver.lastName}
                  </button>
                </td>
                <td>{driver.nationality || '-'}</td>
                <td>{driver.results?.length || 0}</td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Drivers;
