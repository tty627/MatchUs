import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, profileAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      profileAPI.getMe()
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // 注册现在仅创建账号并发送验证邮件，不会直接登录
  const register = async (email, password, confirmPassword, avatarUrl) => {
    const response = await authAPI.register({ email, password, confirmPassword, avatarUrl });
    // 不保存 token，不设置 user，由用户在邮箱中点击验证链接后再登录
    return response.data;
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    localStorage.setItem('token', response.data.token);

    try {
      const profileResponse = await profileAPI.getMe();
      const fullUser = profileResponse.data.user;
      setUser(fullUser);
      return { ...response.data, user: fullUser };
    } catch (error) {
      // Fallback: use minimal user data from auth response
      setUser(response.data.user);
      return response.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
