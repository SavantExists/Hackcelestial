const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('./mongoose/User');
const Merchant = require('./mongoose/Merchant');

function toSafeUser(user) {
  if (!user) return null;
  const values = typeof user.toObject === 'function' ? user.toObject() : user;
  const safe = { ...values };
  delete safe._id;
  delete safe.__v;
  delete safe.passwordHash;
  delete safe.verificationToken;
  delete safe.verificationTokenExpires;
  return safe;
}

function generateVerificationToken() {
  return crypto.randomBytes(24).toString('hex');
}

function findByEmail(email) {
  if (!email) return Promise.resolve(null);
  const normalized = email.trim().toLowerCase();
  return User.findOne({ email: normalized });
}

function findById(id) {
  if (!id) return null;
  return User.findOne({ id: Number(id) });
}

function findByVerificationToken(token) {
  if (!token) return null;
  const trimmed = token.trim();
  return User.findOne({ verificationToken: trimmed });
}

async function createUser({ name, email, password, role, businessName = '', phone, address, latitude, longitude }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  if (!['traveler', 'merchant'].includes(role)) {
    throw new Error('Role must be either "traveler" or "merchant".');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const token = generateVerificationToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  const now = new Date().toISOString();

  const latestUser = await User.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
  const newId = (latestUser?.id || 0) + 1;

  const newUser = await User.create({
    id: newId,
    name: (name || (role === 'merchant' ? businessName : 'Explorer')).trim(),
    businessName: role === 'merchant' ? (businessName || name || '').trim() : undefined,
    email: normalizedEmail,
    passwordHash,
    role,
    emailVerified: false,
    verificationToken: token,
    verificationTokenExpires: expires,
    createdAt: now,
    updatedAt: now
  });

  if (role === 'merchant') {
    await Merchant.create({ 
      userId: newId, 
      name: newUser.name, 
      businessName: newUser.businessName, 
      email: newUser.email, 
      phone, 
      address, 
      latitude: Number(latitude) || null, 
      longitude: Number(longitude) || null,
      createdAt: now 
    });
  }

  return {
    user: toSafeUser(newUser),
    verificationToken: token
  };
}

async function verifyPassword(user, password) {
  if (!user || !user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

async function verifyUserEmail(token, email) {
  const query = { verificationToken: String(token || '').trim() };
  if (email) query.email = email.trim().toLowerCase();
  const user = await User.findOne(query);
  if (!user) throw new Error('Invalid or expired verification token.');

  if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < new Date()) {
    throw new Error('Verification token has expired. Please request a new one.');
  }

  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  user.updatedAt = new Date().toISOString();
  await user.save();

  return toSafeUser(user);
}

module.exports = {
  findByEmail,
  findById,
  findByVerificationToken,
  createUser,
  verifyPassword,
  verifyUserEmail,
  toSafeUser
};
