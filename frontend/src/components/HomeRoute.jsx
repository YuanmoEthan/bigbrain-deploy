import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Component for the home route that redirects based on authentication status
const HomeRoute = () => {
  const { isAuthenticated } = useContext(AuthContext);

  // Redirect to dashboard if authenticated, login if not
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};

export default HomeRoute;