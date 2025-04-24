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