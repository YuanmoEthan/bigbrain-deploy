import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../api';

const Dashboard = () => {
  const [games, setGames] = useState([]);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showJoinGameModal, setShowJoinGameModal] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // 组件挂载和定时刷新时加载游戏
  useEffect(() => {
    fetchGames();

    // 每10秒自动刷新一次游戏列表（为了获取最新的session状态）
    const intervalId = setInterval(() => {
      fetchGames();
    }, 10000);

    // 组件卸载时清除定时器
    return () => clearInterval(intervalId);
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const gamesList = await api.getGames();
      setGames(gamesList);
    } catch (_err) {
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      logout();
      navigate('/login');
    } catch (_err) {
      // Still logout on frontend even if backend fails
      logout();
      navigate('/login');
    }
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) {
      setError('Game name is required');
      return;
    }

    try {
      // Use createGame API function
      setError('');
      setLoading(true);
      const newGame = await api.createGame(newGameName);

      // If creation succeeded but no game object was returned, refresh the entire list
      if (!newGame) {
        await fetchGames();
      } else {
        // Add new game to local state
        setGames([...games, newGame]);
      }

      // Close modal and reset form
      setNewGameName('');
      setShowNewGameModal(false);
    } catch (err) {
      console.error('Failed to create game:', err);
      // Provide more specific error information
      if (err.response?.data?.error) {
        setError(`Failed to create game: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Failed to create game: ${err.message}`);
      } else {
        setError('Failed to create game, please try again later');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async (gameId) => {
    try {
      const response = await api.mutateGame(gameId, 'START');
      setSessionId(response.data.sessionId);
      setShowSessionModal(true);
    } catch (_err) {
      setError('Failed to start game');
    }
  };

  const handleJoinGame = () => {
    if (!joinSessionId.trim()) {
      setError('Session ID is required');
      return;
    }

    // Navigate to the join game screen with the provided session ID
    navigate(`/play/join/${joinSessionId}`);
  };

  const calculateTotalDuration = (questions) => {
    if (!questions || !questions.length) return 0;
    return questions.reduce((sum, q) => sum + (q.duration || 0), 0);
  };

  const copySessionLink = () => {
    const url = `${window.location.origin}/play/${sessionId}`;
    navigator.clipboard.writeText(url);
    alert('Session link copied to clipboard!');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Your BigBrain Games</h1>
        <div className="dashboard-actions">
          <button onClick={() => setShowJoinGameModal(true)} className="join-button">
            Join Game
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="games-controls">
        <button onClick={() => setShowNewGameModal(true)}>
          Create New Game
        </button>
      </div>

      {loading ? (
        <p>Loading games...</p>
      ) : games.length === 0 ? (
        <p>You don&apos;t have any games yet. Create one to get started!</p>
      ) : (
        <div className="games-grid">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <img
                src={game.thumbnail || 'https://via.placeholder.com/150'}
                alt={game.name}
                className="game-thumbnail"
              />
              <h3>{game.name}</h3>
              <p>Question Count: {game.questions ? game.questions.length : 0}</p>
              <p>Total Duration: {calculateTotalDuration(game.questions)} seconds</p>

              <div className="game-actions">
                <button
                  onClick={() => navigate(`/game/${game.id}`)}
                  className="edit-button"
                >
                  Edit
                </button>
                {/* If game has no active session, show "Start Game" button */}
                {game.active === null && (
                  <button
                    onClick={() => handleStartGame(game.id)}
                    className="start-button"
                  >
                    Start Game
                  </button>
                )}
                {/* If game has active session, show "View Session" button */}
                {game.active !== null && (
                  <button
                    onClick={() => navigate(`/session/${game.active}`)}
                    className="session-button"
                  >
                    View Session
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Game Modal */}
      {showNewGameModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create New Game</h2>
            <input
              type="text"
              placeholder="Game Name"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleCreateGame}>Create</button>
              <button onClick={() => setShowNewGameModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Session ID Modal */}
      {showSessionModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Game Session Started</h2>
            <p>Session ID: {sessionId}</p>
            <button onClick={copySessionLink}>Copy Link</button>
            <button onClick={() => setShowSessionModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Join Game Modal */}
      {showJoinGameModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Join Game</h2>
            <div className="form-group">
              <label htmlFor="sessionId">Session ID:</label>
              <input
                type="text"
                id="sessionId"
                value={joinSessionId}
                onChange={(e) => setJoinSessionId(e.target.value)}
                placeholder="Enter session ID"
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleJoinGame}>Join</button>
              <button onClick={() => setShowJoinGameModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;