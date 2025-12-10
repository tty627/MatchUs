import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../utils/api';

const CreatePost = () => {
  const [formData, setFormData] = useState({
    content: '',
    eventTime: '',
    duration: '',
    durationUnit: 'hours',
    location: '',
    targetPeople: ''
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const recommendedTags = ['学习', '运动', '游戏', '音乐', '美食', '电影', '社团活动', '自习', '打球', '跑步', '聚餐', '出行'];

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.content.trim()) {
      setError('请填写活动内容');
      return;
    }

    setLoading(true);
    try {
      // 计算持续时间（转换为分钟存储）
      let durationMinutes = null;
      if (formData.duration) {
        const durationValue = parseInt(formData.duration);
        if (formData.durationUnit === 'hours') {
          durationMinutes = durationValue * 60;
        } else if (formData.durationUnit === 'days') {
          durationMinutes = durationValue * 60 * 24;
        } else {
          durationMinutes = durationValue;
        }
      }

      await postsAPI.createPost({
        content: formData.content,
        eventTime: formData.eventTime || undefined,
        duration: durationMinutes || undefined,
        location: formData.location || undefined,
        targetPeople: formData.targetPeople ? parseInt(formData.targetPeople) : undefined,
        tags: selectedTags
      });

      navigate('/feed');
    } catch (error) {
      console.error('发布动态失败:', error);
      setError(error.response?.data?.error || '发布动态失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/feed');
  };

  return (
    <div className="create-post-page">
      <nav className="feed-nav">
        <div className="nav-content">
          <h2 className="nav-logo">M@CHUS</h2>
          <div className="nav-actions">
            <div className="user-info">
              <div className="user-avatar-small">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" />
                ) : (
                  <span>{user?.nickname?.charAt(0) || 'U'}</span>
                )}
              </div>
              <span className="user-name">{user?.nickname || user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="create-post-container">
        <div className="create-post-form-card">
          <div className="create-post-header">
            <h2>📝 发布新动态</h2>
            <p>分享你的活动，找到志同道合的小伙伴！</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>活动内容 *</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="描述一下你的活动，比如：周末一起去图书馆自习吧！"
                rows={4}
                required
              />
            </div>

            <div className="form-section">
              <h4>📅 时间安排</h4>
              <div className="form-row">
                <div className="form-group form-group-half">
                  <label>开始时间</label>
                  <input
                    type="datetime-local"
                    name="eventTime"
                    value={formData.eventTime}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group form-group-half">
                  <label>持续时长</label>
                  <div className="duration-input">
                    <input
                      type="number"
                      name="duration"
                      min="1"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="例如: 2"
                    />
                    <select
                      name="durationUnit"
                      value={formData.durationUnit}
                      onChange={handleChange}
                    >
                      <option value="minutes">分钟</option>
                      <option value="hours">小时</option>
                      <option value="days">天</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>📍 地点与人数</h4>
              <div className="form-row">
                <div className="form-group form-group-half">
                  <label>活动地点</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="图书馆、食堂、操场..."
                  />
                </div>
                <div className="form-group form-group-half">
                  <label>目标人数</label>
                  <input
                    type="number"
                    name="targetPeople"
                    min="1"
                    value={formData.targetPeople}
                    onChange={handleChange}
                    placeholder="希望多少人参与"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>🏷️ 活动标签</h4>
              <p className="form-hint">选择或添加标签，让更多人发现你的活动</p>
              
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

              <div className="tag-input-row">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="自定义标签，回车添加"
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddTag}>
                  添加
                </button>
              </div>

              {selectedTags.length > 0 && (
                <div className="selected-tags">
                  <span className="selected-tags-label">已选标签：</span>
                  <div className="tags">
                    {selectedTags.map((tag) => (
                      <span key={tag} className="tag tag-selectable tag-selectable-selected">
                        {tag}
                        <span
                          className="tag-remove"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={handleCancel}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '发布中...' : '发布动态'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
