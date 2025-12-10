import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token || !email) {
      setError('重置链接无效，请重新请求重置密码。');
      return;
    }

    if (!password) {
      setError('请填写新密码');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要 6 位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword({ token, email, password, confirmPassword });
      setMessage(response.data?.message || '密码重置成功，请使用新密码登录。');

      // 成功后跳转回登录页
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || '重置失败，请稍后再试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>重置密码</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>校园邮箱</label>
          <input type="email" value={email} disabled />
        </div>

        <div className="form-group">
          <label>新密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '提交中...' : '重置密码'}
        </button>
      </form>

      <p style={{ marginTop: '15px' }}>
        已有账号？ <Link to="/login">返回登录</Link>
      </p>
    </div>
  );
};

export default ResetPassword;
