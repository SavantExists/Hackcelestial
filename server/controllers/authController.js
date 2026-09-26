const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'hiddengemsai_super_secret_jwt_key_2026_dev';
const COOKIE_NAME = 'hgai_token';

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax'
  });
}

async function register(req, res) {
  try {
    const { name, email, password, role, businessName, phone, address, latitude, longitude } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!role || !['traveler', 'merchant'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be either "traveler" or "merchant".' });
    }

    const { user, verificationToken } = await userModel.createUser({
      name,
      email,
      password,
      role,
      businessName,
      phone,
      address,
      latitude,
      longitude
    });

    const devVerificationUrl = `/login.html?verifyToken=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    console.log(`\n========================================`);
    console.log(`[AUTH DEV] New ${role.toUpperCase()} registered: ${user.email}`);
    console.log(`[AUTH DEV] Verification token: ${verificationToken}`);
    console.log(`[AUTH DEV] Verification URL: http://localhost:${process.env.PORT || 3000}${devVerificationUrl}`);
    console.log(`========================================\n`);

    return res.status(201).json({
      success: true,
      data: {
        user,
        message: 'Account created! Please verify your email before logging in.',
        verificationToken,
        devVerificationUrl
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Registration failed.' });
  }
}

async function verifyEmail(req, res) {
  try {
    const { token, email } = req.body;
    const tokenToUse = token || req.query.token;
    const emailToUse = email || req.query.email;

    if (!tokenToUse && !emailToUse) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const user = await userModel.verifyUserEmail(tokenToUse, emailToUse);

    const authToken = createToken(user);
    setAuthCookie(res, authToken);

    return res.json({
      success: true,
      data: {
        user,
        token: authToken,
        message: 'Email successfully verified! You are now authenticated.'
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Verification failed.' });
  }
}

async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await userModel.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role check: prevent traveler logging in via merchant or vice versa if role specified
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as a ${user.role}. Please use the ${user.role} portal.`
      });
    }

    // Check verification status
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        unverified: true,
        message: 'Your email address is not verified yet. Please verify before logging in.',
        data: {
          email: user.email,
          devVerificationToken: user.verificationToken,
          devVerificationUrl: `/login.html?verifyToken=${user.verificationToken}&email=${encodeURIComponent(user.email)}`
        }
      });
    }

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      data: {
        user: userModel.toSafeUser(user),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'An unexpected server error occurred during login.' });
  }
}

function logout(req, res) {
  clearAuthCookie(res);
  return res.json({
    success: true,
    data: { message: 'Logged out successfully.' }
  });
}

async function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  return res.json({
    success: true,
    data: { user: userModel.toSafeUser(user) }
  });
}

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  getMe,
  COOKIE_NAME,
  JWT_SECRET
};
