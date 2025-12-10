import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_SUFFIX = '@shanghaitech.edu.cn';

const Register = () => {
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    if (!emailPrefix.trim()) {
      newErrors.email = '请填写邮箱前缀';
    } else if (!/^[a-zA-Z0-9._%+-]+$/.test(emailPrefix)) {
      newErrors.email = '邮箱前缀包含无效字符';
    }

    if (!password) {
      newErrors.password = '请填写密码';
    } else if (password.length < 6) {
      newErrors.password = '密码至少需要 6 位';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请再次输入密码';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const fullEmail = emailPrefix.trim() + EMAIL_SUFFIX;
    try {
      await register(fullEmail, password, confirmPassword);
      // 跳转到邮件发送成功页面
      navigate('/email-sent', { state: { email: fullEmail } });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.errors?.[0]?.msg ||
                          '注册失败';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>注册 M@CHUS</h1>
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
          {errors.email && <div className="error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <div className="error">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label>确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {errors.confirmPassword && <div className="error">{errors.confirmPassword}</div>}
        </div>

        {errors.general && <div className="error">{errors.general}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p style={{ marginTop: '15px' }}>
        已经有账号了？ <Link to="/login">去登录</Link>
      </p>
    </div>
  );
};

export default Register;
