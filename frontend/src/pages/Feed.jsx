import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../utils/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    eventTime: '',
    location: '',
    targetPeople: '',
    tags: ''
  });
  const { user, logout } = useAuth();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getPosts();
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    try {
      const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      
      await postsAPI.createPost({
        content: formData.content,
        eventTime: formData.eventTime || undefined,
        location: formData.location || undefined,
        targetPeople: formData.targetPeople ? parseInt(formData.targetPeople) : undefined,
        tags: tagsArray
      });

      setFormData({ content: '', eventTime: '', location: '', targetPeople: '', tags: '' });
      setShowCreateForm(false);
      loadPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
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
      console.error('Failed to participate:', error);
      alert(error.response?.data?.error || 'Failed to participate');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      <nav>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>M@CHUS Feed</h2>
          <div>
            <span>Welcome, {user?.nickname}!</span>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
              {showCreateForm ? 'Cancel' : 'Create Post'}
            </button>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        {showCreateForm && (
          <div className="post-card">
            <h2>Create New Post</h2>
            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  placeholder="What are you looking for?"
                />
              </div>

              <div className="form-group">
                <label>Event Time</label>
                <input
                  type="datetime-local"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Library, Cafeteria"
                />
              </div>

              <div className="form-group">
                <label>Target Number of People</label>
                <input
                  type="number"
                  min="1"
                  value={formData.targetPeople}
                  onChange={(e) => setFormData({ ...formData, targetPeople: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., Study, Sports, Event"
                />
              </div>

              <button type="submit" className="btn btn-primary">Post</button>
            </form>
          </div>
        )}

        <h2>Campus Posts</h2>
        {posts.length === 0 ? (
          <p>No posts yet. Be the first to post!</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ fontSize: '16px' }}>
                  Posted by: {post.author.nickname}
                  {post.hasParticipated && post.author.realName && (
                    <span style={{ color: '#28a745', marginLeft: '10px' }}>
                      (Real name: {post.author.realName})
                    </span>
                  )}
                </strong>
              </div>

              <p style={{ fontSize: '15px', marginBottom: '10px' }}>{post.content}</p>

              {post.eventTime && (
                <div className="post-meta">📅 Event Time: {new Date(post.eventTime).toLocaleString()}</div>
              )}
              {post.location && (
                <div className="post-meta">📍 Location: {post.location}</div>
              )}
              {post.targetPeople && (
                <div className="post-meta">👥 Looking for: {post.targetPeople} people</div>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="tags">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '15px' }}>
                {post.hasParticipated ? (
                  <button className="btn btn-success" disabled>
                    ✓ Participated
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleParticipate(post.id)}
                  >
                    Participate
                  </button>
                )}
              </div>

              <div className="post-meta" style={{ marginTop: '10px' }}>
                Posted {new Date(post.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
