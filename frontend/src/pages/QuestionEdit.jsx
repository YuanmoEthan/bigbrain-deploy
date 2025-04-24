import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../api';

const QuestionEdit = () => {
  const { gameId, questionId } = useParams();
  const [game, setGame] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Question form state
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('single');
  const [timeLimit, setTimeLimit] = useState(30);
  const [points, setPoints] = useState(10);
  const [mediaUrl, setMediaUrl] = useState('');
  const [answers, setAnswers] = useState([]);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load game and question details when component mounts
  useEffect(() => {
    fetchGameAndQuestion();
  }, [gameId, questionId]);

  // Update form state when question data is loaded
  useEffect(() => {
    if (question) {
      setQuestionText(question.text || '');
      setQuestionType(question.type || 'single');
      setTimeLimit(question.timeLimit || 30);
      setPoints(question.points || 10);
      setMediaUrl(question.mediaUrl || '');
      setAnswers(question.answers || []);
    }
  }, [question]);

  const fetchGameAndQuestion = async () => {
    try {
      setLoading(true);
      // Get all games and filter for the current one
      const games = await api.getGames();
      const currentGame = games.find(g => g.id === parseInt(gameId, 10));

      if (!currentGame) {
        setError('Game not found');
        return;
      }

      setGame(currentGame);

      // Find the question within the game
      const currentQuestion = currentGame.questions.find(
        q => q.id === parseInt(questionId, 10)
      );

      if (!currentQuestion) {
        setError('Question not found');
        return;
      }

      setQuestion(currentQuestion);
    } catch (_err) {
      setError('Failed to load question details');
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

  const handleSaveQuestion = async () => {
    try {
      // Validate form
      if (!questionText.trim()) {
        setError('Question text is required');
        return;
      }

      if (answers.length < 2) {
        setError('At least 2 answers are required');
        return;
      }

      // For single and judgement types, ensure exactly one answer is selected
      if ((questionType === 'single' || questionType === 'judgement') &&
          answers.filter(a => a.isCorrect).length !== 1) {
        setError(`${questionType === 'single' ? 'Single' : 'Judgement'} choice questions must have exactly one correct answer`);
        return;
      }

      // Create updated question object
      const updatedQuestion = {
        ...question,
        text: questionText,
        type: questionType,
        timeLimit: timeLimit,
        points: points,
        mediaUrl: mediaUrl,
        answers: answers,
      };

      // Update question in game.questions array
      const updatedQuestions = game.questions.map(q =>
        q.id === parseInt(questionId, 10) ? updatedQuestion : q
      );

      // Create updated game object
      const updatedGame = {
        ...game,
        questions: updatedQuestions
      };

      // Save changes to backend
      setLoading(true);
      await api.updateGame(updatedGame);

      // Update local state
      setGame(updatedGame);
      setQuestion(updatedQuestion);
      setError('');

      // Show success message
      alert('Question saved successfully!');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save question: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, field, value) => {
    const updatedAnswers = [...answers];
    updatedAnswers[index] = {
      ...updatedAnswers[index],
      [field]: value,
    };
    setAnswers(updatedAnswers);
  };

  const handleCorrectAnswerToggle = (index) => {
    const updatedAnswers = [...answers];

    // For single and judgement types, uncheck all answers first
    if (questionType === 'single' || questionType === 'judgement') {
      updatedAnswers.forEach(answer => {
        answer.isCorrect = false;
      });
    }

    // Toggle the selected answer
    updatedAnswers[index] = {
      ...updatedAnswers[index],
      isCorrect: !updatedAnswers[index].isCorrect,
    };

    setAnswers(updatedAnswers);
  };

  const addAnswer = () => {
    if (answers.length >= 6) {
      setError('Maximum 6 answers allowed');
      return;
    }

    setAnswers([...answers, { id: Date.now(), text: '', isCorrect: false }]);
  };

  const removeAnswer = (index) => {
    if (answers.length <= 2) {
      setError('Minimum 2 answers required');
      return;
    }

    const updatedAnswers = [...answers];
    updatedAnswers.splice(index, 1);
    setAnswers(updatedAnswers);
  };

  if (loading) {
    return <p>Loading question details...</p>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!question) {
    return <p>Question not found</p>;
  }

  return (
    <div className="question-edit-container">
      <div className="question-edit-header">
        <h1>Edit Question</h1>
        <button onClick={() => navigate(`/game/${gameId}`)} className="back-button">
          Back to Game
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="question-form">
        <div className="form-group">
          <label htmlFor="questionText">Question Text:</label>
          <input
            type="text"
            id="questionText"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="questionType">Question Type:</label>
          <select
            id="questionType"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
          >
            <option value="single">Single Choice</option>
            <option value="multiple">Multiple Choice</option>
            <option value="judgement">Judgement</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="timeLimit">Time Limit (seconds):</label>
          <input
            type="number"
            id="timeLimit"
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
            min="5"
            max="120"
          />
        </div>

        <div className="form-group">
          <label htmlFor="points">Points:</label>
          <input
            type="number"
            id="points"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value, 10))}
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mediaUrl">Media URL (optional):</label>
          <input
            type="text"
            id="mediaUrl"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Enter YouTube URL or image URL"
          />
        </div>

        <h3>Answers (Min: 2, Max: 6)</h3>
        {answers.map((answer, index) => (
          <div key={answer.id} className="answer-item">
            <div className="form-group">
              <label htmlFor={`answer-${index}`}>Answer {index + 1}:</label>
              <input
                type="text"
                id={`answer-${index}`}
                value={answer.text}
                onChange={(e) => handleAnswerChange(index, 'text', e.target.value)}
              />
            </div>
            <div className="answer-actions">
              <label>
                <input
                  type={questionType === 'multiple' ? 'checkbox' : 'radio'}
                  checked={answer.isCorrect}
                  onChange={() => handleCorrectAnswerToggle(index)}
                />
                Correct Answer
              </label>
              <button
                onClick={() => removeAnswer(index)}
                className="remove-button"
                disabled={answers.length <= 2}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="answer-controls">
          <button
            onClick={addAnswer}
            disabled={answers.length >= 6}
          >
            Add Answer
          </button>
        </div>

        <div className="form-actions">
          <button onClick={handleSaveQuestion} className="save-button">
            Save Question
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionEdit;