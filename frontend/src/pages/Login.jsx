import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_SUFFIX = '@shanghaitech.edu.cn';

const Login = () => {
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailPrefix.trim() || !password) {
      setError('请填写完整邮箱和密码');
      return;
    }

    setLoading(true);
    const fullEmail = emailPrefix.trim() + EMAIL_SUFFIX;
    try {
      const data = await login(fullEmail, password);
      
      if (data.user.profile_completed) {
        navigate('/feed');
      } else {
        navigate('/profile-setup');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || '登录失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>登录 M@CHUS</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>校园邮箱</label>
          <div className="email-input-wrapper">
            <input
              type="text"
              value={emailPrefix}
              onChange={(e) => setEmailPrefix(e.target.value)}
              placeholder="请输入邮箱前缀"
            />
            <span className="email-suffix">{EMAIL_SUFFIX}</span>
          </div>
        </div>

        <div className="form-group">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p style={{ marginTop: '10px' }}>
        忘记密码了？ <Link to="/forgot-password">重置密码</Link>
      </p>

      <p style={{ marginTop: '15px' }}>
        还没有账号？ <Link to="/register">去注册</Link>
      </p>
    </div>
  );
};

export default Login;
