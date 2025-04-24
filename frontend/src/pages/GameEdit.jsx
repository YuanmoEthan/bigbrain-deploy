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
