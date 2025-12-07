import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Feed from './pages/Feed';

const ProtectedRoute = ({ children, requireProfileComplete = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireProfileComplete && !user.profile_completed) {
    return <Navigate to="/profile-setup" />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/register" element={user ? <Navigate to="/feed" /> : <Register />} />
      <Route path="/login" element={user ? <Navigate to="/feed" /> : <Login />} />
      
      <Route 
        path="/profile-setup" 
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/feed" 
        element={
          <ProtectedRoute requireProfileComplete={true}>
            <Feed />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/" element={<Navigate to="/feed" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;
