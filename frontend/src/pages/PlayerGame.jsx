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

    // Check immediately
    checkForQuestionUpdates();

    // Then set up polling (every 1 second to be more responsive)
    questionUpdateInterval = setInterval(checkForQuestionUpdates, 1000);

    return () => {
      if (questionUpdateInterval) {
        console.log('Clearing question update interval');
        clearInterval(questionUpdateInterval);
      }
    };
  }, [playerId, gameStarted, gameEnded, currentQuestion, currentPosition, answerSubmitted, correctAnswers, error]);

  // Additional useEffect to handle answer feedback and prepare for next question
  useEffect(() => {
    // If we have submitted an answer and received correct answers
    if (answerSubmitted && correctAnswers) {
      console.log('Answer submitted and correct answers received, ready for next question');

      // We don't need to do anything here - just make the UI show the feedback
      // The question polling will handle detecting new questions
    }
  }, [answerSubmitted, correctAnswers]);

  // Timer for current question
  useEffect(() => {
    if (!currentQuestion || answerSubmitted || !gameStarted) return;

    // Make sure question has a timestamp
    if (!currentQuestion.isoTimeLastQuestionStarted) {
      console.warn('Question missing start time');
      return;
    }

    const questionStartTime = new Date(currentQuestion.isoTimeLastQuestionStarted).getTime();
    const questionDuration = (currentQuestion.timeLimit || 30) * 1000; // Default 30 seconds
    const endTime = questionStartTime + questionDuration;

    // Initial time calculation
    const initialTimeLeft = Math.max(0, Math.floor((endTime - new Date().getTime()) / 1000));
    setTimeLeft(initialTimeLeft);

    // Update timer every second
    const timerInterval = setInterval(() => {
      const newTimeLeft = Math.max(0, Math.floor((endTime - new Date().getTime()) / 1000));
      setTimeLeft(newTimeLeft);

      // When timer runs out, try to get the correct answer
      if (newTimeLeft === 0 && !answerSubmitted) {
        clearInterval(timerInterval);
        setAnswerSubmitted(true);
        fetchCorrectAnswers();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [currentQuestion, answerSubmitted, gameStarted]);

  const fetchCurrentQuestion = async () => {
    try {
      const question = await api.getPlayerQuestion(playerId);

      if (!question) {
        console.warn('No question returned from API');
        return;
      }

      setCurrentQuestion(question);
      setCurrentPosition(question.position || -1);
      setSelectedAnswers([]);
      setAnswerSubmitted(false);
      setCorrectAnswers(null);
      setError('');
    } catch (err) {
      console.error('Question fetch error:', err);

      if (err.response?.status === 403) {
        // Game might be over, check for results
        try {
          const playerResults = await api.getPlayerResults(playerId);
          setResults(playerResults);
          setGameEnded(true);
          setGameStarted(false);
        } catch (_resultErr) {
          setError('Game has ended, but results could not be retrieved');
          setGameEnded(true);
        }
      } else if (err.response?.status === 400) {
        setError('Invalid player ID');
        setGameEnded(true);
      } else {
        setError('Unable to get current question');
      }
    }
  };

  const fetchCorrectAnswers = async () => {
    try {
      const answers = await api.getPlayerAnswers(playerId);
      setCorrectAnswers(answers);
    } catch (_err) {
      console.log('Answers not yet available, may need to wait for admin action');
      // Don't set error, as this is expected behavior
    }
  };

  const handleAnswerSelect = (answerId) => {
    // Don't allow changes if answer already submitted or game ended
    if (answerSubmitted || gameEnded) return;

    let newSelectedAnswers;

    // For multiple choice questions
    if (currentQuestion.type === 'multiple') {
      if (selectedAnswers.includes(answerId)) {
        newSelectedAnswers = selectedAnswers.filter(id => id !== answerId);
      } else {
        newSelectedAnswers = [...selectedAnswers, answerId];
      }
    } else {
      // For single choice and judgement questions
      newSelectedAnswers = [answerId];

      // 对于单选和判断题，立即提交答案
      submitAnswer(newSelectedAnswers);
    }

    setSelectedAnswers(newSelectedAnswers);

    // 不再为所有类型的问题自动提交答案，而是仅为单选和判断题提交
  };

  // 添加一个新的提交按钮处理函数
  const handleSubmitAnswers = () => {
    if (selectedAnswers.length === 0 || answerSubmitted) return;
    submitAnswer(selectedAnswers);
  };

  const submitAnswer = async (answerIds) => {
    if (!answerIds || answerIds.length === 0) {
      // Don't submit empty answers
      return;
    }

    try {
      console.log('Submitting answer:', answerIds);

      // Mark as submitted first to prevent double submission
      setAnswerSubmitted(true);

      // Submit to backend
      await api.submitPlayerAnswers(playerId, answerIds);
      setError('');

      console.log('Answer submitted successfully');

      // After submitting, try to get correct answers
      try {
        const answers = await api.getPlayerAnswers(playerId);
        if (answers && answers.length > 0) {
          console.log('Received correct answers immediately:', answers);
          setCorrectAnswers(answers);
        } else {
          console.log('No correct answers available yet');
        }
      } catch (answerErr) {
        console.log('Could not get correct answers yet:', answerErr.message);
        // This is expected, will retry in polling
      }

      // Manually trigger a check for updates in case polling is delayed
      setTimeout(() => {
        console.log('Checking for question updates after answer submission');
        api.getPlayerQuestion(playerId)
          .then(newQuestion => {
            if (newQuestion && newQuestion.position !== currentPosition) {
              console.log('New question detected after answer submission:', newQuestion.position);
              setCurrentPosition(newQuestion.position);
              setCurrentQuestion(newQuestion);
              setSelectedAnswers([]);
              setAnswerSubmitted(false);
              setCorrectAnswers(null);
              setError('');
            }
          })
          .catch(err => {
            console.log('Error checking for new question:', err.message);
          });
      }, 1500); // Wait 1.5 seconds before checking

    } catch (err) {
      console.error('Submit answer error:', err);
      setAnswerSubmitted(false); // Reset so user can try again

      if (err.response?.status === 400) {
        // Session might have ended
        try {
          // Try to get results
          const playerResults = await api.getPlayerResults(playerId);
          if (playerResults) {
            setResults(playerResults);
            setGameEnded(true);
            return;
          }
        } catch (_resultErr) {
          // Ignore this error
        }

        setError('Unable to submit answer, session may have ended');
      } else {
        setError('Error submitting answer');
      }
    }
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  // Game ended state
  if (gameEnded && !results) {
    return (
      <div className="game-ended-screen">
        <h1>Game Ended</h1>
        <p>{error || 'Session has closed, thanks for participating!'}</p>
        <button onClick={handleReturnHome} className="return-button">
          Return to Homepage
        </button>
      </div>
    );
  }

  // Render the waiting screen
  if (!gameStarted && !results && !gameEnded) {
    return (
      <div className="waiting-screen">
        <h1>Waiting for Game to Start</h1>
        <p>Please wait for the admin to start the game.</p>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  // Render the results screen
  if (results) {
    const correctCount = results.filter(answer => answer.correct).length;

    return (
      <div className="results-screen">
        <h1>Game Results</h1>
        <div className="results-summary">
          <h2>You answered {correctCount} out of {results.length} questions correctly!</h2>
        </div>

        <div className="results-details">
          <h3>Question Details:</h3>
          {results.map((result, index) => (
            <div key={index} className="question-result">
              <p>Question {index + 1}:</p>
              <p>Correct: {result.correct ? 'Yes' : 'No'}</p>
              <p>Time taken: {result.answeredAt && result.questionStartedAt
                ? ((new Date(result.answeredAt).getTime() - new Date(result.questionStartedAt).getTime()) / 1000).toFixed(2)
                : 'N/A'} seconds</p>
            </div>
          ))}
        </div>

        <button onClick={handleReturnHome} className="return-button">
          Return to Homepage
        </button>
      </div>
    );
  }

  // Render the question screen
  if (loading && !currentQuestion) {
    return <p>Loading question...</p>;
  }

  if (error && !currentQuestion) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={handleReturnHome} className="return-button">
          Return to Homepage
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="no-question-container">
        <p>No question available</p>
        <button onClick={handleReturnHome} className="return-button">
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="player-game-container">
      <div className="game-header">
        <div className="timer">Time remaining: {timeLeft} seconds</div>
      </div>

      <div className="question">
        <h2>{currentQuestion.text}</h2>

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
      </div>

      <div className="answers">
        {currentQuestion.answers.map((answer) => (
          <div
            key={answer.id}
            className={`answer-option ${selectedAnswers.includes(answer.id) ? 'selected' : ''} ${
              answerSubmitted && correctAnswers &&
              (correctAnswers.includes(answer.id) ? 'correct' : (selectedAnswers.includes(answer.id) ? 'incorrect' : ''))
            }`}
            onClick={() => handleAnswerSelect(answer.id)}
          >
            {answer.text}
          </div>
        ))}
      </div>

      {currentQuestion.type === 'multiple' && !answerSubmitted && (
        <button
          onClick={handleSubmitAnswers}
          className="submit-button"
          disabled={selectedAnswers.length === 0}
        >
          Submit Answers
        </button>
      )}

      {answerSubmitted && !correctAnswers && (
        <div className="answer-feedback">
          <p>Answer submitted! Waiting for the next question...</p>
        </div>
      )}

      {answerSubmitted && correctAnswers && (
        <div className="answer-feedback">
          <h3>Correct Answers:</h3>
          <ul>
            {currentQuestion.answers
              .filter(answer => correctAnswers.includes(answer.id))
              .map(answer => (
                <li key={answer.id}>{answer.text}</li>
              ))
            }
          </ul>
          <p>Waiting for the next question...</p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default PlayerGame;