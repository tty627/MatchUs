import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'error'
  const [message, setMessage] = useState('正在验证你的邮箱，请稍候...');

  useEffect(() => {
    const verify = async () => {
      if (!token || !email) {
        setStatus('error');
        setMessage('验证链接不完整或已失效，请重新注册或请求新的验证邮件。');
        return;
      }

      try {
        const response = await authAPI.verifyEmail({ token, email });
        setStatus('success');
        setMessage(response.data?.message || '邮箱验证成功，你现在可以使用该邮箱登录 M@CHUS。');

        // 几秒后自动跳转到登录页
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        const errorMessage =
          err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || '邮箱验证失败，请重试。';
        setStatus('error');
        setMessage(errorMessage);
      }
    };

    verify();
  }, [token, email, navigate]);

  return (
    <div className="auth-container">
      <h1>邮箱验证</h1>
      <p className={status === 'error' ? 'error' : 'success'}>{message}</p>

      <p style={{ marginTop: '15px' }}>
        已有账号？ <Link to="/login">去登录</Link>
      </p>
    </div>
  );
};

export default VerifyEmail;
