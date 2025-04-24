import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../api';

const GameEdit = () => {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load game details when component mounts
  useEffect(() => {
    fetchGameDetails();
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      setLoading(true);
      // Get all games and find the current one
      const games = await api.getGames();
      const currentGame = games.find(g => g.id === parseInt(gameId, 10));

      if (!currentGame) {
        setError('Game not found');
        return;
      }

      // Make sure the game object has owner field, which is required for saving to backend
      if (!currentGame.owner) {
        // Get current user email from localStorage
        const email = localStorage.getItem('email');
        if (!email) {
          setError('Unable to determine game owner, please log in again');
          return;
        }
        currentGame.owner = email;
      }

      setGame(currentGame);
    } catch (err) {
      console.error('Failed to load game details:', err);
      if (err.response?.data?.error) {
        setError(`Failed to load game details: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Failed to load game details: ${err.message}`);
      } else {
        setError('Failed to load game details, please try again later');
      }
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

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) {
      setError('Question text is required');
      return;
    }

    try {
      // Create new question object
      const newQuestion = {
        id: Date.now(), // Use timestamp as temporary ID
        text: newQuestionText,
        type: 'single',
        timeLimit: 30,
        points: 10,
        answers: [
          { id: 1, text: 'Answer 1', isCorrect: true },
          { id: 2, text: 'Answer 2', isCorrect: false },
        ],
      };

      // Update local state
      const updatedQuestions = [...(game.questions || []), newQuestion];
      const updatedGame = { ...game, questions: updatedQuestions };
      setGame(updatedGame);

      // Call API to save to backend
      setLoading(true);
      await api.updateGame(updatedGame);

      // Close modal and reset form
      setNewQuestionText('');
      setShowAddQuestionModal(false);
    } catch (err) {
      console.error('Failed to add question:', err);
      if (err.response?.data?.error) {
        setError(`Failed to add question: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Failed to add question: ${err.message}`);
      } else {
        setError('Failed to add question, please try again later');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      // Remove question from local state
      const updatedQuestions = game.questions.filter(q => q.id !== questionId);
      const updatedGame = { ...game, questions: updatedQuestions };
      setGame(updatedGame);

      // Call API to save to backend
      setLoading(true);
      await api.updateGame(updatedGame);
    } catch (err) {
      console.error('Failed to delete question:', err);
      if (err.response?.data?.error) {
        setError(`Failed to delete question: ${err.response.data.error}`);
      } else if (err.message) {
        setError(`Failed to delete question: ${err.message}`);
      } else {
        setError('Failed to delete question, please try again later');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (questionId) => {
    navigate(`/game/${gameId}/question/${questionId}`);
  };

  if (loading) {
    return <p>Loading game details...</p>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!game) {
    return <p>Game not found</p>;
  }

  return (
    <div className="game-edit-container">
      <div className="game-edit-header">
        <h1>Edit Game: {game.name}</h1>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          Back to Dashboard
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="questions-controls">
        <button onClick={() => setShowAddQuestionModal(true)}>
          Add New Question
        </button>
      </div>

      <h2>Questions</h2>
      {game.questions && game.questions.length > 0 ? (
        <div className="questions-list">
          {game.questions.map((question, index) => (
            <div key={question.id} className="question-item">
              <div className="question-info">
                <h3>Question {index + 1}</h3>
                <p>{question.text}</p>
                <p>Type: {question.type}</p>
                <p>Time Limit: {question.timeLimit} seconds</p>
                <p>Points: {question.points}</p>
              </div>
              <div className="question-actions">
                <button
                  onClick={() => handleEditQuestion(question.id)}
                  className="edit-button"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No questions yet. Add your first question!</p>
      )}

      {/* Add Question Modal */}
      {showAddQuestionModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add New Question</h2>
            <div className="form-group">
              <label htmlFor="questionText">Question Text:</label>
              <input
                type="text"
                id="questionText"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Enter question text"
              />
            </div>
            <p>Note: You can edit more details after creating the question.</p>
            <div className="modal-actions">
              <button onClick={handleAddQuestion}>Add</button>
              <button onClick={() => setShowAddQuestionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameEdit;