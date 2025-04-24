import axios from 'axios';
import config from '../backend.config.json';

const API_URL = `http://localhost:${config.BACKEND_PORT}`;

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API calls
export const login = async (email, password) => {
  const response = await api.post('/admin/auth/login', { email, password });
  return response.data;
};

export const register = async (email, password, name) => {
  const response = await api.post('/admin/auth/register', { email, password, name });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/admin/auth/logout');
  return response.data;
};

// Game API calls
export const getGames = async () => {
  const response = await api.get('/admin/games');
  return response.data.games;
};

export const createGame = async (gameName) => {
  // Create a new game by updating the games list with PUT request
  const existingGames = await getGames();

  // Get current user email from localStorage
  const email = localStorage.getItem('email');
  if (!email) {
    throw new Error('User not logged in, cannot create game');
  }

  // Create a new game object with all required fields
  const newGame = {
    id: Date.now(), // Temporary ID, backend will reassign
    name: gameName,
    owner: email, // Add required owner field
    questions: [], // Empty questions array
    thumbnail: null, // No thumbnail
    active: null, // No active session
    createdAt: new Date().toISOString() // Creation time
  };

  // Add to existing games list
  const updatedGames = [...existingGames, newGame];

  // Send PUT request to update games list
  await api.put('/admin/games', { games: updatedGames });

  // Refresh games list to get correct ID assigned by backend
  const refreshedGames = await getGames();

  // Find the newly created game (filtered by name and sorted by creation time)
  const createdGames = refreshedGames
    .filter(game => game.name === gameName)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const createdGame = createdGames[0]; // Get the most recent one
  return createdGame;
};

export const mutateGame = async (gameId, mutationType) => {
  const response = await api.post(`/admin/game/${gameId}/mutate`, { mutationType });
  return response.data;
};

export const updateGame = async (game) => {
  // Get existing games list
  const existingGames = await getGames();

  // Ensure game object has all required fields
  if (!game.id || !game.name || !game.owner) {
    throw new Error('Game object is missing required fields (id, name, owner)');
  }

  // Find the game we want to update and replace it with new data
  const updatedGames = existingGames.map(g =>
    g.id === game.id ? { ...g, ...game } : g
  );

  // Send PUT request to update games list
  await api.put('/admin/games', { games: updatedGames });

  // Refresh games list to confirm update
  const refreshedGames = await getGames();

  // Return the updated game object
  return refreshedGames.find(g => g.id === game.id);
};

export const getSessionStatus = async (sessionId) => {
  const response = await api.get(`/admin/session/${sessionId}/status`);
  return response.data.results;
};

export const getSessionResults = async (sessionId) => {
  const response = await api.get(`/admin/session/${sessionId}/results`);
  return response.data.results;
};

// Player API calls
export const joinGame = async (sessionId, name) => {
  const response = await api.post(`/play/join/${sessionId}`, { name });
  return response.data;
};

export const getPlayerStatus = async (playerId) => {
  const response = await api.get(`/play/${playerId}/status`);
  return response.data;
};

export const getPlayerQuestion = async (playerId) => {
  const response = await api.get(`/play/${playerId}/question`);
  return response.data.question;
};

export const getPlayerAnswers = async (playerId) => {
  const response = await api.get(`/play/${playerId}/answer`);
  return response.data.answerIds;
};

export const submitPlayerAnswers = async (playerId, answerIds) => {
  const response = await api.put(`/play/${playerId}/answer`, { answerIds });
  return response.data;
};

export const getPlayerResults = async (playerId) => {
  const response = await api.get(`/play/${playerId}/results`);
  return response.data;
};