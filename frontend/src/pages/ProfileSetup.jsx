import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../utils/api';

const ProfileSetup = () => {
  const [formData, setFormData] = useState({
    realName: '',
    nickname: '',
    grade: '',
    gender: '',
    bio: '',
    tags: '',
    avatarUrl: ''
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const recommendedTags = ['学习', '运动', '游戏', '音乐', '摄影', '美食', '旅行', '电影', '编程', '社团活动'];

  const isEditing = user && user.profile_completed;

  useEffect(() => {
    if (user) {
      setFormData({
        realName: user.real_name || '',
        nickname: user.nickname || '',
        grade: user.grade || '',
        gender: user.gender || '',
        bio: user.bio || '',
        tags: '',
        avatarUrl: user.avatar_url || ''
      });
      setSelectedTags(user.tags || []);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;

    if (!selectedTags.includes(newTag)) {
      setSelectedTags((prev) => [...prev, newTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarError('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('请选择图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('图片大小不能超过 2MB');
      return;
    }

    const formDataToUpload = new FormData();
    formDataToUpload.append('avatar', file);

    setAvatarUploading(true);
    try {
      const res = await profileAPI.uploadAvatar(formDataToUpload);
      const newAvatarUrl = res.data.avatarUrl || res.data.user?.avatar_url || '';
      setFormData((prev) => ({
        ...prev,
        avatarUrl: newAvatarUrl,
      }));
      if (res.data.user) {
        updateUser(res.data.user);
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      setAvatarError(error.response?.data?.error || '上传头像失败');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('确定要注销账号吗？此操作不可恢复，并且会删除你发布的所有动态和参与记录。');
    if (!confirmed) return;

    try {
      await profileAPI.deleteAccount();
      alert('账号已注销');
      logout();
    } catch (error) {
      console.error('注销账号失败:', error);
      alert(error.response?.data?.error || '注销账号失败');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.realName.trim()) {
      newErrors.realName = '请填写真实姓名';
    }
    if (!formData.nickname.trim()) {
      newErrors.nickname = '请填写昵称';
    }
    if (!formData.grade.trim()) {
      newErrors.grade = '请选择年级';
    }
    if (!formData.gender) {
      newErrors.gender = '请选择性别';
    }
    if (!formData.bio.trim()) {
      newErrors.bio = '请填写个人简介';
    }
    if (!selectedTags.length) {
      newErrors.tags = '请至少选择一个标签';
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
    try {
      const response = await profileAPI.completeProfile({
        realName: formData.realName,
        nickname: formData.nickname,
        grade: formData.grade,
        gender: formData.gender,
        bio: formData.bio,
        tags: selectedTags,
        avatarUrl: formData.avatarUrl || undefined
      });

      updateUser(response.data.user);
      navigate('/feed');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.errors?.[0]?.msg ||
                          '完善个人信息失败';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>{isEditing ? '个人主页' : '完善个人主页'}</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        {isEditing ? '在这里查看和修改你的个人主页信息。' : '请先完善个人信息，才能访问校园动态'}
      </p>

      <div style={{ maxWidth: '600px', background: 'white', padding: '30px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#eee',
              flexShrink: 0,
            }}
          >
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: 12,
                }}
              >
                无头像
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>上传头像</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
              />
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                支持常见图片格式（JPG/PNG/GIF），大小不超过 2MB。
              </div>
              {avatarUploading && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>上传中...</div>
              )}
              {avatarError && <div className="error">{avatarError}</div>}
              {formData.avatarUrl && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4, wordBreak: 'break-all' }}>
                  当前头像链接：{formData.avatarUrl}
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>真实姓名（仅自己可见）*</label>
            <input
              type="text"
              name="realName"
              value={formData.realName}
              onChange={handleChange}
              placeholder="请输入真实姓名"
            />
            {errors.realName && <div className="error">{errors.realName}</div>}
          </div>

          <div className="form-group">
            <label>昵称（对外展示）*</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="请输入昵称（将展示给其他人）"
            />
            {errors.nickname && <div className="error">{errors.nickname}</div>}
          </div>

          <div className="form-group">
            <label>年级 *</label>
            <select name="grade" value={formData.grade} onChange={handleChange}>
              <option value="">请选择年级</option>
              <option value="Freshman">大一</option>
              <option value="Sophomore">大二</option>
              <option value="Junior">大三</option>
              <option value="Senior">大四</option>
              <option value="Graduate">研究生</option>
            </select>
            {errors.grade && <div className="error">{errors.grade}</div>}
          </div>

          <div className="form-group">
            <label>性别 *</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="">请选择性别</option>
              <option value="Male">男</option>
              <option value="Female">女</option>
              <option value="Other">其他</option>
              <option value="Prefer not to say">不透露</option>
            </select>
            {errors.gender && <div className="error">{errors.gender}</div>}
          </div>

          <div className="form-group">
            <label>个人简介 *</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="简单介绍一下你自己..."
            />
            {errors.bio && <div className="error">{errors.bio}</div>}
          </div>

          <div className="form-group">
            <label>标签 *</label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              从下方标签模块中选择适合你的标签，也可以自定义添加新的标签。
            </p>

            <div className="tags">
              {recommendedTags.map((tag) => (
                <span
                  key={tag}
                  className={`tag tag-selectable ${selectedTags.includes(tag) ? 'tag-selectable-selected' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="输入自定义标签后点击“添加”"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddTag}>
                添加
              </button>
            </div>

            {selectedTags.length > 0 && (
              <div className="tags" style={{ marginTop: '10px' }}>
                {selectedTags.map((tag) => (
                  <span key={tag} className="tag tag-selectable tag-selectable-selected">
                    {tag}
                    <span
                      style={{ marginLeft: 6, cursor: 'pointer' }}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}

            {errors.tags && <div className="error">{errors.tags}</div>}
          </div>

          {errors.general && <div className="error">{errors.general}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '保存中...' : (isEditing ? '保存修改' : '保存并进入校园动态')}
          </button>

          {isEditing && (
            <div style={{ marginTop: '30px' }}>
              <div 
                onClick={() => setShowDangerZone(!showDangerZone)}
                style={{ 
                  cursor: 'pointer', 
                  color: '#999', 
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ transform: showDangerZone ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
                账号设置
              </div>
              {showDangerZone && (
                <div style={{ marginTop: '12px', padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                    注销账号后，所有数据将被永久删除且不可恢复。
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: '#dc3545', 
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    注销账号
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
