import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi, Session } from '../api';

function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getNlsNumber = (name: string): number => {
    const match = name.match(/\bNLS\s*(\d+)\b/i) || name.match(/\bNLS(\d+)\b/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  const sessionSort = (a: Session, b: Session) => {
    const nlsDiff = getNlsNumber(a.name) - getNlsNumber(b.name);
    if (nlsDiff !== 0) return nlsDiff;
    if (a.name !== b.name) return a.name.localeCompare(b.name, 'de');
    if (a.type === b.type) return 0;
    return a.type === 'QUALI' ? -1 : 1;
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await sessionsApi.getAll();
        setSessions([...response.data].sort(sessionSort));
      } catch (err) {
        setError('Failed to load sessions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  if (loading) return <div className="loading">Loading sessions...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Sessions</h2>
      
      <div className="grid">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="session-card"
            onClick={() => navigate(`/sessions/${session.id}`)}
          >
            <h3>{session.name}</h3>
            <div>
              <span className={`badge ${session.type.toLowerCase()}`}>
                {session.type}
              </span>
              <span style={{ color: '#888', fontSize: '0.875rem' }}>
                {new Date(session.date).toLocaleDateString('de-DE')}
              </span>
            </div>
            <p style={{ marginTop: '1rem', color: '#888' }}>
              {session.type === 'RACE' ? 'Race' : 'Qualifying'} •{' '}
              {new Date(session.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            No sessions found. Import CSV data to get started.
          </p>
        </div>
      )}
    </div>
  );
}

export default Sessions;
