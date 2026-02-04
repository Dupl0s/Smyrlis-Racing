import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi, Session } from '../api';

function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsRes = await sessionsApi.getAll();
        setSessions(sessionsRes.data);
      } catch (err) {
        setError('Failed to load sessions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading sessions...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Racing Sessions</h2>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Select a session to view results and analyze lap times
      </p>
      
      {/* Group sessions by name pattern */}
      {(() => {
        // Extract base session names (e.g., "NLS1", "NLS2")
        const groupedSessions = sessions.reduce((acc, session) => {
          const baseName = session.name.replace(/\s*(Zeittraining|Rennen|QUALI|RACE).*/, '').trim();
          if (!acc[baseName]) {
            acc[baseName] = { quali: null, race: null };
          }
          if (session.type === 'QUALI') {
            acc[baseName].quali = session;
          } else {
            acc[baseName].race = session;
          }
          return acc;
        }, {} as Record<string, { quali: Session | null; race: Session | null }>);

        return Object.entries(groupedSessions).map(([groupName, { quali, race }]) => (
          <div key={groupName}>
            {/* Group Separator */}
            <div style={{
              margin: '2rem 0 1rem 0',
              padding: '0.5rem 0',
              borderTop: '2px solid #444',
              borderBottom: '2px solid #444',
              backgroundColor: '#2a2a2a',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#888',
              fontSize: '0.9rem',
              letterSpacing: '1px'
            }}>
              ━━━━━━ {groupName} ━━━━━━
            </div>

            {/* Sessions grid for this group */}
            <div className="grid" style={{ marginBottom: '2rem' }}>
              {quali && (
                <SessionCard 
                  session={quali} 
                  navigate={navigate}
                />
              )}
              {race && (
                <SessionCard 
                  session={race} 
                  navigate={navigate}
                />
              )}
            </div>
          </div>
        ));
      })()}

      {sessions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#888' }}>No sessions found. Import CSV data to get started.</p>
        </div>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  navigate: (path: string) => void;
}

function SessionCard({ session, navigate }: SessionCardProps) {
  return (
    <div 
      className="session-card"
      onClick={() => navigate(`/sessions/${session.id}`)}
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '2px solid transparent'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
        e.currentTarget.style.borderColor = '#3498db';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <h3 style={{ marginBottom: '0.5rem' }}>{session.name}</h3>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <span className={`badge ${session.type.toLowerCase()}`}>
          {session.type}
        </span>
        <span style={{ color: '#888', fontSize: '0.875rem' }}>
          {new Date(session.date).toLocaleDateString('de-DE')}
        </span>
      </div>
      <div style={{ fontSize: '0.9rem', color: '#666' }}>
        <p style={{ margin: '0.25rem 0' }}>
          📅 {new Date(session.date).toLocaleDateString('de-DE', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#999' }}>
        Click to view details →
      </div>
    </div>
  );
}

export default Dashboard;
