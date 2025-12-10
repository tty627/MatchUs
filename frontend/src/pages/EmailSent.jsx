import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const EmailSent = () => {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <div className="auth-container">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📧</div>
        <h1>验证邮件已发送</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          我们已向 <strong>{email || '你的邮箱'}</strong> 发送了一封验证邮件
        </p>
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>请按以下步骤完成注册：</p>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
            <li>打开你的校园邮箱</li>
            <li>找到来自 M@CHUS 的验证邮件</li>
            <li>点击邮件中的验证链接</li>
            <li>验证成功后即可登录</li>
          </ol>
        </div>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
          没收到邮件？请检查垃圾邮件文件夹，或等待几分钟后重试
        </p>
        <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
          前往登录
        </Link>
      </div>
    </div>
  );
};

export default EmailSent;
