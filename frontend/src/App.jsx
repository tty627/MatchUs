import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import EmailSent from './pages/EmailSent';

const ProtectedRoute = ({ children, requireProfileComplete = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container">加载中...</div>;
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
      <Route path="/forgot-password" element={user ? <Navigate to="/feed" /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/feed" /> : <ResetPassword />} />
      <Route path="/verify-email" element={user ? <Navigate to="/feed" /> : <VerifyEmail />} />
      <Route path="/email-sent" element={user ? <Navigate to="/feed" /> : <EmailSent />} />
      
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

      <Route 
        path="/create-post" 
        element={
          <ProtectedRoute requireProfileComplete={true}>
            <CreatePost />
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
