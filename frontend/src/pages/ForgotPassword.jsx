import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('请填写校园邮箱');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword({ email });
      setMessage(
        response.data?.message ||
          '如果该邮箱已注册，我们已经发送了密码重置链接，请查收邮箱（当前环境下链接会打印在后台日志中）。'
      );
    } catch (err) {
      const errorMessage = err.response?.data?.error || '请求失败，请稍后再试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>忘记密码</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>校园邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.name@shanghaitech.edu.cn"
          />
        </div>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '提交中...' : '发送重置链接'}
        </button>
      </form>

      <p style={{ marginTop: '15px' }}>
        想起密码了？ <Link to="/login">返回登录</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
