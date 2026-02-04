import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionDetails from './pages/SessionDetails';
import Drivers from './pages/Drivers';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="container">
            <h1>🏎️ Racing Data Analysis</h1>
            <div className="nav-links">
              <Link to="/">Dashboard</Link>
              <Link to="/sessions">Sessions</Link>
              <Link to="/drivers">Drivers</Link>
            </div>
          </div>
        </nav>

        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetails />} />
            <Route path="/drivers" element={<Drivers />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
