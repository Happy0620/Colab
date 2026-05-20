import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { setToken, setUser } = useAppContext();
  const navigate = useNavigate();

  const validateName = (val: string) => {
    if (!val) {
      setNameError('');
      return false;
    }
    const isValid = /^[A-Za-z\s\-']+$/.test(val);
    if (!isValid) setNameError('Name must contain letters only');
    else setNameError('');
    return isValid;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    validateName(e.target.value);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass || pass.length < 8) return 'Weak';
    let types = 0;
    if (/[a-z]/.test(pass)) types++;
    if (/[A-Z]/.test(pass)) types++;
    if (/[0-9]/.test(pass)) types++;
    if (/[^a-zA-Z0-9]/.test(pass)) types++;
    if (types >= 3) return 'Strong';
    if (types >= 2) return 'Medium';
    return 'Weak';
  };

  const strength = getPasswordStrength(password);
  const strengthColor = strength === 'Strong' ? '#22C55E' : strength === 'Medium' ? '#F59E0B' : '#EF4444';

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateName(name)) {
      alert('Please enter a valid full name (letters only).');
      return;
    }

    if (strength === 'Weak') {
      alert('Password is too weak. It must be at least 8 characters long and contain at least 2 character types.');
      return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    const btn = document.getElementById('signupSubmitBtn') as HTMLButtonElement;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: isAdmin ? 'admin' : 'customer' })
      });
      const data = await res.json();
      
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        navigate('/');
      } else {
        alert(data.message || 'Signup failed');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  };

  return (
    <div className="auth-body">
      <div className="container">
        <nav className="navbar">
          <Link to="/" className="logo">Feasto</Link>
        </nav>
      </div>

      <div className="auth-container">
        <div className="auth-card signup-card">
          <div className="signup-image">
            <div className="signup-image-overlay">
              <p style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.4, color: 'white' }}>
                Experience the digital<br />epicurean journey today.
              </p>
            </div>
          </div>

          <div className="signup-form-container">
            <div className="auth-header text-left">
              <h2>Create Your Account</h2>
              <p>Join and start ordering delicious food</p>
            </div>

            <form id="signupForm" onSubmit={handleSignupSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper" style={{ border: nameError ? '1px solid #EF4444' : 'none', borderRadius: 'var(--border-radius-lg)' }}>
                  <i className="fa-regular fa-user"></i>
                  <input type="text" value={name} onChange={handleNameChange} placeholder="John Doe" required />
                </div>
                {nameError && <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}>{nameError}</div>}
              </div>

              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <i className="fa-regular fa-envelope"></i>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" required />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Password</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-lock"></i>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`} onClick={() => setShowPassword(!showPassword)}></i>
                  </div>
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                        <div style={{ flex: 1, background: strengthColor, borderRadius: '2px' }}></div>
                        <div style={{ flex: 1, background: strength === 'Medium' || strength === 'Strong' ? strengthColor : '#eee', borderRadius: '2px' }}></div>
                        <div style={{ flex: 1, background: strength === 'Strong' ? strengthColor : '#eee', borderRadius: '2px' }}></div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 600, textAlign: 'right' }}>{strength}</div>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                    <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}></i>
                  </div>
                </div>
              </div>

              <div className="checkbox-group" style={{ marginTop: '24px' }}>
                <input type="checkbox" id="adminRole" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
                <label htmlFor="adminRole">
                  Register as Admin (for testing)
                </label>
              </div>

              <div className="checkbox-group" style={{ marginTop: '12px' }}>
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </label>
              </div>

              <button type="submit" id="signupSubmitBtn" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                Create Account <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
              </button>

              <p className="form-subtext">
                Already have an account? <Link to="/login" className="text-link">Login</Link>
              </p>
            </form>
          </div>
        </div>

        <div className="login-floating-images">
          <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Food 1" className="floating-img" />
          <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Food 2" className="floating-img" style={{ transform: 'scale(1.1)', zIndex: 5 }} />
          <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Food 3" className="floating-img" />
        </div>
      </div>
    </div>
  );
}
