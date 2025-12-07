import React, { useState } from 'react';
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
    tags: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.realName.trim()) {
      newErrors.realName = 'Real name is required';
    }
    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Nickname is required';
    }
    if (!formData.grade.trim()) {
      newErrors.grade = 'Grade is required';
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    }
    if (!formData.tags.trim()) {
      newErrors.tags = 'At least one tag is required';
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
      // Convert tags string to array
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const response = await profileAPI.completeProfile({
        realName: formData.realName,
        nickname: formData.nickname,
        grade: formData.grade,
        gender: formData.gender,
        bio: formData.bio,
        tags: tagsArray
      });

      updateUser(response.data.user);
      navigate('/feed');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.errors?.[0]?.msg ||
                          'Failed to complete profile';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Complete Your Profile</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Please complete your profile to access the campus feed
      </p>

      <div style={{ maxWidth: '600px', background: 'white', padding: '30px', borderRadius: '8px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Real Name (Private) *</label>
            <input
              type="text"
              name="realName"
              value={formData.realName}
              onChange={handleChange}
              placeholder="Your real name"
            />
            {errors.realName && <div className="error">{errors.realName}</div>}
          </div>

          <div className="form-group">
            <label>Nickname (Public) *</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="How others will see you"
            />
            {errors.nickname && <div className="error">{errors.nickname}</div>}
          </div>

          <div className="form-group">
            <label>Grade *</label>
            <select name="grade" value={formData.grade} onChange={handleChange}>
              <option value="">Select your grade</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate">Graduate</option>
            </select>
            {errors.grade && <div className="error">{errors.grade}</div>}
          </div>

          <div className="form-group">
            <label>Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender && <div className="error">{errors.gender}</div>}
          </div>

          <div className="form-group">
            <label>Bio *</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
            />
            {errors.bio && <div className="error">{errors.bio}</div>}
          </div>

          <div className="form-group">
            <label>Tags * (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., Basketball, Gaming, Photography"
            />
            {errors.tags && <div className="error">{errors.tags}</div>}
          </div>

          {errors.general && <div className="error">{errors.general}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
