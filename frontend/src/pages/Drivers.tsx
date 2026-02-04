import { useEffect, useState } from 'react';
import { driversApi, Driver } from '../api';

function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <h2>Drivers</h2>
      
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
            {drivers.map((driver: any) => (
              <tr key={driver.id}>
                <td>
                  {driver.firstName} {driver.lastName}
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
