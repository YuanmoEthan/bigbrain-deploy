import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../api';

const SessionManage = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultsView, setResultsView] = useState(false);
  const [results, setResults] = useState([]);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Poll for session status every 2 seconds
  useEffect(() => {
    fetchSessionStatus();

    const interval = setInterval(() => {
      if (!resultsView) {
        fetchSessionStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, resultsView]);

  // Fetch results when switching to results view
  useEffect(() => {
    if (resultsView) {
      fetchSessionResults();
    }
  }, [resultsView]);

  const fetchSessionStatus = async () => {
    try {
      setLoading(true);
      const sessionData = await api.getSessionStatus(sessionId);

      // The session status API doesn't return gameId, so we need to get it from games list
      if (!sessionData.gameId) {
        try {
          // Get all games to find which one has this session as active
          const games = await api.getGames();
          const game = games.find(g => g.active === parseInt(sessionId, 10));

          if (game) {
            // Add gameId to session data
            sessionData.gameId = game.id.toString();
            console.log(`Found gameId ${sessionData.gameId} for session ${sessionId}`);
          }
        } catch (err) {
          console.error('Failed to get gameId for session:', err);
        }
      }

      setSession(sessionData);
    } catch (_err) {
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionResults = async () => {
    try {
      setLoading(true);
      const resultsData = await api.getSessionResults(sessionId);
      setResults(resultsData);
    } catch (_err) {
      setError('Failed to load results');
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
      logout();
      navigate('/login');
    }
  };

  const handleAdvance = async () => {
    try {
      // Get the gameId from session
      if (!session || !session.gameId) {
        setError('Session data not available. Please try again.');
        return;
      }

      const gameId = session.gameId;
      console.log(`Advancing game: ${gameId}`);

      await api.mutateGame(gameId, 'ADVANCE');
      await fetchSessionStatus();
    } catch (err) {
      console.error('Failed to advance:', err);
      setError('Failed to advance to next question');
    }
  };

  const handleStopSession = async () => {
    try {
      // Get the gameId from session
      if (!session || !session.gameId) {
        setError('Session data not available. Please try again.');
        return;
      }

      const gameId = session.gameId;
      console.log(`Stopping game: ${gameId}`);

      await api.mutateGame(gameId, 'END');
      setShowStopConfirm(false);

      // Show results confirmation
      const confirmed = window.confirm('Would you like to view the results?');
      if (confirmed) {
        setResultsView(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to stop session:', err);
      setError('Failed to stop session');
    }
  };

  const renderCurrentQuestion = () => {
    if (!session || session.position === -1) {
      return (
        <div className="waiting-screen">
          <h2>Waiting for players to join</h2>
          <p>Current players: {session.players.length}</p>
          <p>Press &quot;Start Game&quot; to begin the first question.</p>
        </div>
      );
    }

    const currentQuestion = session.questions[session.position];

    if (!currentQuestion) {
      return <p>No question data available</p>;
    }

    return (
      <div className="current-question">
        <h2>Question {session.position + 1}</h2>
        <p>{currentQuestion.text}</p>

        {currentQuestion.mediaUrl && (
          <div className="question-media">
            {currentQuestion.mediaUrl.includes('youtube') ? (
              <iframe
                src={currentQuestion.mediaUrl}
                title="Question Video"
                width="560"
                height="315"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <img src={currentQuestion.mediaUrl} alt="Question Media" />
            )}
          </div>
        )}

        <div className="question-info">
          <p>Type: {currentQuestion.type}</p>
          <p>Time Limit: {currentQuestion.timeLimit} seconds</p>
          <p>Points: {currentQuestion.points}</p>
        </div>

        <h3>Answers:</h3>
        <ul className="answers-list">
          {currentQuestion.answers.map((answer) => (
            <li key={answer.id}>
              {answer.text} {answer.isCorrect && '(Correct)'}
            </li>
          ))}
        </ul>
      </div>
    );
  };