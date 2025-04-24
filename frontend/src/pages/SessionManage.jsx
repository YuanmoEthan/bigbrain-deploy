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

  const renderTopFivePlayers = () => {
    // Sort players by score
    const sortedPlayers = [...results].sort((a, b) => {
      const scoreA = a.answers.filter(ans => ans.correct).length;
      const scoreB = b.answers.filter(ans => ans.correct).length;
      return scoreB - scoreA;
    }).slice(0, 5);

    return (
      <div className="top-players">
        <h3>Top Players</h3>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{player.name}</td>
                <td>{player.answers.filter(ans => ans.correct).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderQuestionPerformanceChart = () => {
    // Calculate percentage of correct answers per question
    const questionStats = [];

    if (session && session.questions) {
      for (let i = 0; i < session.questions.length; i++) {
        let correctCount = 0;
        let totalAttempts = 0;

        results.forEach(player => {
          if (player.answers[i] && player.answers[i].answeredAt) {
            totalAttempts++;
            if (player.answers[i].correct) {
              correctCount++;
            }
          }
        });

        const percentage = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
        questionStats.push({
          questionNumber: i + 1,
          percentageCorrect: percentage.toFixed(2),
        });
      }
    }

    return (
      <div className="question-stats">
        <h3>Question Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Percentage Correct</th>
            </tr>
          </thead>
          <tbody>
            {questionStats.map((stat) => (
              <tr key={stat.questionNumber}>
                <td>{stat.questionNumber}</td>
                <td>{stat.percentageCorrect}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAverageResponseTimeChart = () => {
    // Calculate average response time per question
    const responseTimeStats = [];

    if (session && session.questions) {
      for (let i = 0; i < session.questions.length; i++) {
        let totalTime = 0;
        let totalResponses = 0;

        results.forEach(player => {
          if (player.answers[i] && player.answers[i].answeredAt && player.answers[i].questionStartedAt) {
            const startTime = new Date(player.answers[i].questionStartedAt).getTime();
            const endTime = new Date(player.answers[i].answeredAt).getTime();
            const responseTime = (endTime - startTime) / 1000; // Convert to seconds

            totalTime += responseTime;
            totalResponses++;
          }
        });

        const averageTime = totalResponses > 0 ? totalTime / totalResponses : 0;
        responseTimeStats.push({
          questionNumber: i + 1,
          averageResponseTime: averageTime.toFixed(2),
        });
      }
    }

    return (
      <div className="response-time-stats">
        <h3>Average Response Time (seconds)</h3>
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Average Time (s)</th>
            </tr>
          </thead>
          <tbody>
            {responseTimeStats.map((stat) => (
              <tr key={stat.questionNumber}>
                <td>{stat.questionNumber}</td>
                <td>{stat.averageResponseTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading && !session) {
    return <p>Loading session data...</p>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!session) {
    return <p>Session not found</p>;
  }

  if (resultsView) {
    return (
      <div className="results-container">
        <div className="results-header">
          <h1>Session Results</h1>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        {renderTopFivePlayers()}
        {renderQuestionPerformanceChart()}
        {renderAverageResponseTimeChart()}
      </div>
    );
  }

  return (
    <div className="session-container">
      <div className="session-header">
        <h1>Game Session: {sessionId}</h1>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          Back to Dashboard
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

{error && <div className="error-message">{error}</div>}

<div className="session-status">
  <p>Status: {session.active ? 'Active' : 'Ended'}</p>
  <p>Position: {session.position === -1 ? 'Lobby' : session.position + 1}</p>
  <p>Players: {session.players.length}</p>
</div>

<div className="session-controls">
  {session.active && (
    <>
      <button
        onClick={handleAdvance}
        // Only disable the button if:
        // 1. We're at the last question (not in lobby but at the end) OR
        // 2. We're in the lobby AND there are no players yet
        // 3. There are no questions in the game
        disabled={(session.position !== -1 && session.position >= session.questions.length - 1) ||
                (session.position === -1 && session.players.length === 0) ||
                !session.questions || session.questions.length === 0}
      >
        {session.position === -1 ? 'Start Game' : 'Next Question'}
      </button>
      <button onClick={() => setShowStopConfirm(true)}>
        Stop Session
      </button>
    </>
  )}

  {!session.active && (
    <button onClick={() => setResultsView(true)}>
      View Results
    </button>
  )}
</div>

{renderCurrentQuestion()}

{/* Confirmation Modal */}
{showStopConfirm && (
  <div className="modal">
    <div className="modal-content">
      <h2>Stop Session</h2>
      <p>Are you sure you want to stop this session? This cannot be undone.</p>
      <div className="modal-actions">
        <button onClick={handleStopSession}>Yes, Stop Session</button>
        <button onClick={() => setShowStopConfirm(false)}>Cancel</button>
      </div>
    </div>
  </div>
)}
</div>
);
};

export default SessionManage;