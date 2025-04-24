import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';

const PlayerGame = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(-1);

  // Poll for game status and updates when not started
  useEffect(() => {
    let statusInterval;

    const checkGameStatus = async () => {
      try {
        setLoading(true);
        const status = await api.getPlayerStatus(playerId);

        if (status.started) {
          setGameStarted(true);
          await fetchCurrentQuestion();
        }
      } catch (err) {
        console.error('Game status error:', err);
        // Session might be ended or invalid
        if (err.response?.status === 400) {
          try {
            // Try to get results
            const playerResults = await api.getPlayerResults(playerId);
            setResults(playerResults);
            setGameEnded(true);
            setError('');
          } catch (_resultErr) {
            setError('Session has ended or is invalid. Please return to the homepage to rejoin.');
            setGameEnded(true);
          }
        } else {
          setError('Unable to check game status, please try again later');
        }
      } finally {
        setLoading(false);
      }
    };

    checkGameStatus();

    // Only poll for status when game is not started and not ended
    if (!gameStarted && !gameEnded) {
      statusInterval = setInterval(checkGameStatus, 2000);
    }

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [playerId, gameStarted, gameEnded]);

  // Poll for question updates when game has started
  useEffect(() => {
    let questionUpdateInterval;

    // Don't poll if game hasn't started or has ended
    if (!gameStarted || gameEnded) return;

    const checkForQuestionUpdates = async () => {
      try {
        console.log('Checking for question updates, playerID:', playerId);

        // First check game status to ensure game is still active
        const status = await api.getPlayerStatus(playerId);
        if (!status.started) {
          console.log('Game status shows game is no longer started');
          // Try to get results if game has finished
          try {
            const playerResults = await api.getPlayerResults(playerId);
            setResults(playerResults);
            setGameEnded(true);
            setGameStarted(false);
            return;
          } catch (_err) {
            // Ignore errors from results, will be handled below
          }
        }

        // Get current question
        const question = await api.getPlayerQuestion(playerId);

        // Debug question data
        console.log('Received question:', JSON.stringify(question, null, 2));

        if (!question) {
          console.warn('No question returned from API');
          return;
        }

        // Extract position from question or from API response
        // Different APIs might return position in different ways
        const newPosition = question.position !== undefined ? question.position :
          (currentQuestion?.position !== undefined ? currentQuestion.position + 1 : 0);

        console.log('Current position:', currentPosition, 'New position:', newPosition);

        // Check if this is a new question (position changed or first question)
        if (newPosition !== currentPosition || !currentQuestion) {
          console.log('Updating to new question at position:', newPosition);

          // Update state with new question
          setCurrentPosition(newPosition);
          setCurrentQuestion(question);
          setSelectedAnswers([]);
          setAnswerSubmitted(false);
          setCorrectAnswers(null);
          setError('');
        }

        // If we've submitted an answer for current question, check if answer is available
        else if (answerSubmitted && !correctAnswers) {
          try {
            console.log('Checking for correct answers');
            const answers = await api.getPlayerAnswers(playerId);
            if (answers && answers.length > 0) {
              console.log('Received correct answers:', answers);
              setCorrectAnswers(answers);
            }
          } catch (_err) {
            // Don't set error when checking for correct answers
          }
        }
      } catch (err) {
        console.error('Question update error:', err);

        // If 403, game might be over (final results available)
        if (err.response?.status === 403) {
          console.log('Received 403, checking for results');
          try {
            const playerResults = await api.getPlayerResults(playerId);
            if (playerResults) {
              console.log('Game ended with results');
              setResults(playerResults);
              setGameEnded(true);
              setGameStarted(false);
            }
          } catch (_resultErr) {
            // If we can't get results, just notify user
            if (!error) {
              console.log('Could not get results after 403');
              setError('Game may have ended. Waiting for final results...');
            }
          }
        } else if (err.response?.status === 400) {
          console.log('Received 400, player ID may be invalid');
          setError('Session error. Please try rejoining the game.');
          setGameEnded(true);
        }
        // Don't set other errors during polling to avoid UI flicker
      }
    };