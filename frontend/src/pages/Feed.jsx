import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../utils/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participantsModal, setParticipantsModal] = useState({ open: false, postId: null, participants: [], loading: false, isOwnerOrAdmin: false });
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, post: null });
  const [editFormData, setEditFormData] = useState({ content: '', eventTime: '', duration: '', durationUnit: 'hours', location: '', targetPeople: '', tags: '' });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getPosts();
      setPosts(response.data.posts);
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = async (postId) => {
    try {
      const response = await postsAPI.participate(postId);
      
      // Update the specific post in the list
      setPosts(posts.map(post => 
        post.id === postId ? response.data.post : post
      ));
    } catch (error) {
      console.error('参与失败:', error);
      alert(error.response?.data?.error || '参与失败');
    }
  };

  const handleCancelParticipation = async (postId) => {
    const confirmCancel = window.confirm('确定要取消参与该活动吗？');
    if (!confirmCancel) return;

    try {
      const response = await postsAPI.cancelParticipation(postId);

      // Update the specific post in the list after cancellation
      setPosts(posts.map(post => 
        post.id === postId ? response.data.post : post
      ));
    } catch (error) {
      console.error('取消参与失败:', error);
      alert(error.response?.data?.error || '取消参与失败');
    }
  };

  const handleShowParticipants = async (postId, authorId) => {
    const isOwnerOrAdmin = user?.is_admin || user?.id === authorId;
    setParticipantsModal({ open: true, postId, participants: [], loading: true, isOwnerOrAdmin });
    try {
      const response = await postsAPI.getParticipants(postId);
      setParticipantsModal({ open: true, postId, participants: response.data.participants, loading: false, isOwnerOrAdmin });
    } catch (error) {
      console.error('获取参与者失败:', error);
      setParticipantsModal({ open: false, postId: null, participants: [], loading: false, isOwnerOrAdmin: false });
      alert(error.response?.data?.error || '获取参与者失败');
    }
  };

  const closeParticipantsModal = () => {
    setParticipantsModal({ open: false, postId: null, participants: [], loading: false, isOwnerOrAdmin: false });
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('确定要删除这条动态吗？')) return;
    try {
      await postsAPI.deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('删除失败:', error);
      alert(error.response?.data?.error || '删除失败');
    }
  };

  // 将 duration（分钟）转换为显示格式
  const formatDuration = (minutes) => {
    if (!minutes) return null;
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} 天`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} 小时`;
    } else {
      return `${minutes} 分钟`;
    }
  };

  // 将 duration（分钟）转换为编辑表单的值
  const parseDurationForEdit = (minutes) => {
    if (!minutes) return { duration: '', durationUnit: 'hours' };
    if (minutes >= 1440 && minutes % 1440 === 0) {
      return { duration: String(minutes / 1440), durationUnit: 'days' };
    } else if (minutes >= 60 && minutes % 60 === 0) {
      return { duration: String(minutes / 60), durationUnit: 'hours' };
    } else {
      return { duration: String(minutes), durationUnit: 'minutes' };
    }
  };

  const handleOpenEditModal = (post) => {
    const durationParsed = parseDurationForEdit(post.duration);
    setEditFormData({
      content: post.content || '',
      eventTime: post.eventTime ? new Date(post.eventTime).toISOString().slice(0, 16) : '',
      duration: durationParsed.duration,
      durationUnit: durationParsed.durationUnit,
      location: post.location || '',
      targetPeople: post.targetPeople || '',
      tags: post.tags?.join(', ') || ''
    });
    setEditModal({ open: true, post });
  };

  const handleEditPost = async (e) => {
    e.preventDefault();
    if (!editModal.post) return;
    try {
      const tagsArray = editFormData.tags ? editFormData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      
      // 计算持续时间（转换为分钟）
      let durationMinutes = null;
      if (editFormData.duration) {
        const durationValue = parseInt(editFormData.duration);
        if (editFormData.durationUnit === 'hours') {
          durationMinutes = durationValue * 60;
        } else if (editFormData.durationUnit === 'days') {
          durationMinutes = durationValue * 60 * 24;
        } else {
          durationMinutes = durationValue;
        }
      }

      await postsAPI.updatePost(editModal.post.id, {
        content: editFormData.content,
        eventTime: editFormData.eventTime || null,
        duration: durationMinutes,
        location: editFormData.location || null,
        targetPeople: editFormData.targetPeople ? parseInt(editFormData.targetPeople) : null,
        tags: tagsArray
      });
      setEditModal({ open: false, post: null });
      loadPosts();
    } catch (error) {
      console.error('修改失败:', error);
      alert(error.response?.data?.error || '修改失败');
    }
  };

  const handleKickParticipant = async (userId) => {
    if (!window.confirm('确定要移除该参与者吗？')) return;
    try {
      await postsAPI.kickParticipant(participantsModal.postId, userId);
      setParticipantsModal(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== userId)
      }));
      loadPosts();
    } catch (error) {
      console.error('移除失败:', error);
      alert(error.response?.data?.error || '移除失败');
    }
  };

  const canManagePost = (post) => {
    return user?.is_admin || user?.id === post.author?.id;
  };

  const gradeMap = {
    'Freshman': '大一',
    'Sophomore': '大二',
    'Junior': '大三',
    'Senior': '大四',
    'Graduate': '研究生'
  };

  if (loading) {
    return <div className="container">加载中...</div>;
  }

  return (
    <div className="feed-page">
      {/* 导航栏 */}
      <nav className="feed-nav">
        <div className="nav-content">
          <h2 className="nav-logo">M@CHUS</h2>
          <div className="nav-actions">
            <div className="user-info" onClick={() => navigate('/profile-setup')}>
              <div className="user-avatar-small">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" />
                ) : (
                  <span>{user?.nickname?.charAt(0) || 'U'}</span>
                )}
              </div>
              <span className="user-name">{user?.nickname || user?.email}</span>
            </div>
            <button onClick={() => navigate('/create-post')} className="btn btn-primary">
              + 发布
            </button>
            <button onClick={logout} className="btn btn-outline">
              退出
            </button>
          </div>
        </div>
      </nav>

      <div className="feed-container">
        {/* 动态列表 */}
        <div className="posts-header">
          <h2>🎓 校园动态</h2>
          <span className="posts-count">共 {posts.length} 条</span>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            <p>暂无动态，快来发布第一条吧！</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              {/* 作者信息 */}
              <div className="post-header" onClick={() => setSelectedUser(post.author)} style={{ cursor: 'pointer' }}>
                <div className="post-avatar">
                  {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt="avatar" />
                  ) : (
                    <span>{post.author.nickname?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="post-author-info">
                  <span className="post-author-name">{post.author.nickname}</span>
                  <span className="post-time">{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* 内容 */}
              <p className="post-content">{post.content}</p>

              {/* 活动信息 */}
              <div className="post-details">
                {post.eventTime && (
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <span>{new Date(post.eventTime).toLocaleString()}</span>
                  </div>
                )}
                {post.duration && (
                  <div className="detail-item">
                    <span className="detail-icon">⏱️</span>
                    <span>持续 {formatDuration(post.duration)}</span>
                  </div>
                )}
                {post.location && (
                  <div className="detail-item">
                    <span className="detail-icon">📍</span>
                    <span>{post.location}</span>
                  </div>
                )}
                {post.targetPeople && (
                  <div className="detail-item">
                    <span className="detail-icon">👥</span>
                    <span>目标 {post.targetPeople} 人</span>
                  </div>
                )}
              </div>

              {/* 标签 */}
              {post.tags && post.tags.length > 0 && (
                <div className="post-tags">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* 参与信息和操作 */}
              <div className="post-footer">
                <div className="participants-info">
                  {(post.hasParticipated || canManagePost(post)) && parseInt(post.participantsCount) > 0 && (
                    <div 
                      className="participants-avatars"
                      onClick={() => handleShowParticipants(post.id, post.author?.id)}
                      title="点击查看参与者"
                    >
                      <span className="participants-count">👥 {post.participantsCount} 人参与</span>
                      <span className="view-participants">查看 →</span>
                    </div>
                  )}
                  {!post.hasParticipated && !canManagePost(post) && parseInt(post.participantsCount) > 0 && (
                    <span className="participants-count-only">👥 {post.participantsCount} 人参与</span>
                  )}
                </div>
                <div className="post-actions">
                  {canManagePost(post) && (
                    <>
                      <button className="btn btn-text" onClick={() => handleOpenEditModal(post)}>编辑</button>
                      <button className="btn btn-text" style={{ color: '#dc3545' }} onClick={() => handleDeletePost(post.id)}>删除</button>
                    </>
                  )}
                  {post.hasParticipated ? (
                    <>
                      <span className="participated-badge">✓ 已参与</span>
                      <button 
                        className="btn btn-text"
                        onClick={() => handleCancelParticipation(post.id)}
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleParticipate(post.id)}
                    >
                      参与活动
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 参与者弹窗 */}
      {participantsModal.open && (
        <div className="modal-overlay" onClick={closeParticipantsModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 参与者列表</h3>
              <button className="modal-close" onClick={closeParticipantsModal}>×</button>
            </div>
            <div className="modal-body">
              {participantsModal.loading ? (
                <div className="loading">加载中...</div>
              ) : participantsModal.participants.length === 0 ? (
                <div className="empty">暂无参与者</div>
              ) : (
                <div className="participants-list">
                  {participantsModal.participants.map(p => (
                    <div 
                      key={p.id} 
                      className="participant-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }} onClick={() => setSelectedUser(p)}>
                        <div className="participant-avatar">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt="avatar" />
                          ) : (
                            <span>{p.nickname?.charAt(0) || 'U'}</span>
                          )}
                        </div>
                        <div className="participant-info">
                          <span className="participant-name">{p.nickname}</span>
                          {p.grade && <span className="participant-grade">{gradeMap[p.grade] || p.grade}</span>}
                        </div>
                      </div>
                      {participantsModal.isOwnerOrAdmin && (
                        <button 
                          className="btn btn-text" 
                          style={{ color: '#dc3545', padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleKickParticipant(p.id)}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editModal.open && (
        <div className="modal-overlay" onClick={() => setEditModal({ open: false, post: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>编辑动态</h3>
              <button className="modal-close" onClick={() => setEditModal({ open: false, post: null })}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditPost}>
                <div className="form-group">
                  <label>内容</label>
                  <textarea
                    value={editFormData.content}
                    onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>活动时间</label>
                  <input
                    type="datetime-local"
                    value={editFormData.eventTime}
                    onChange={(e) => setEditFormData({ ...editFormData, eventTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>持续时长</label>
                  <div className="duration-input">
                    <input
                      type="number"
                      min="1"
                      value={editFormData.duration}
                      onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                      placeholder="例如: 2"
                    />
                    <select
                      value={editFormData.durationUnit}
                      onChange={(e) => setEditFormData({ ...editFormData, durationUnit: e.target.value })}
                    >
                      <option value="minutes">分钟</option>
                      <option value="hours">小时</option>
                      <option value="days">天</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>地点</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>目标人数</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.targetPeople}
                    onChange={(e) => setEditFormData({ ...editFormData, targetPeople: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>标签（用逗号分隔）</label>
                  <input
                    type="text"
                    value={editFormData.tags}
                    onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full">保存修改</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 用户主页弹窗 */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content user-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>用户主页</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="profile-header">
                <div className="profile-avatar-large">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="avatar" />
                  ) : (
                    <span>{selectedUser.nickname?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <h2 className="profile-name">{selectedUser.nickname}</h2>
                {selectedUser.grade && (
                  <span className="profile-grade">{gradeMap[selectedUser.grade] || selectedUser.grade}</span>
                )}
              </div>
              {selectedUser.bio && (
                <div className="profile-section">
                  <h4>个人简介</h4>
                  <p>{selectedUser.bio}</p>
                </div>
              )}
              {selectedUser.tags && selectedUser.tags.length > 0 && (
                <div className="profile-section">
                  <h4>标签</h4>
                  <div className="profile-tags">
                    {selectedUser.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
