import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import HomeRoute from './components/HomeRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GameEdit from './pages/GameEdit';
import QuestionEdit from './pages/QuestionEdit';
import SessionManage from './pages/SessionManage';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import './styles/main.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Routes - Protected */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/game/:gameId"
              element={
                <PrivateRoute>
                  <GameEdit />
                </PrivateRoute>
              }
            />
            <Route
              path="/game/:gameId/question/:questionId"
              element={
                <PrivateRoute>
                  <QuestionEdit />
                </PrivateRoute>
              }
            />
            <Route
              path="/session/:sessionId"
              element={
                <PrivateRoute>
                  <SessionManage />
                </PrivateRoute>
              }
            />

            {/* Player Routes */}
            <Route path="/play/join/:sessionId" element={<PlayerJoin />} />
            <Route path="/play/:playerId" element={<PlayerGame />} />

            {/* Default Routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="*" element={<HomeRoute />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
