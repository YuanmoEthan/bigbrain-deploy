import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../api';

const PlayerJoin = () => {
  const { sessionId } = useParams();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Call API to join game
      const data = await api.joinGame(sessionId, name);

      // Navigate to game play screen with player ID
      navigate(`/play/${data.playerId}`);
    } catch (_err) {
      setError(_err.response?.data?.error || 'Failed to join game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="player-join-container">
      <h1>Join BigBrain Game</h1>
      <h2>Session: {sessionId}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Your Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your name"
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
};

export default PlayerJoin;