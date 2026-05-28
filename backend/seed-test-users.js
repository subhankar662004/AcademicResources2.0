import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  avatar:    { type: String, default: '' },
  bio:       { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

const TEST_USERS = [
  {
    name:     'Admin User',
    email:    'admin@test.com',
    password: 'Admin@123',
    role:     'admin',
    bio:      'Platform administrator for Academic Resources Hub.',
  },
  {
    name:     'Teacher User',
    email:    'teacher@test.com',
    password: 'Teacher@123',
    role:     'teacher',
    bio:      'Computer Science lecturer. Creates tests and shares resources.',
  },
  {
    name:     'Student User',
    email:    'student@test.com',
    password: 'Student@123',
    role:     'student',
    bio:      'Second-year Engineering student. Loves learning!',
  },
];

const encodeMongoURI = (uri) => {
  if (!uri) return uri;
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return uri;
  const [, protocol, user, password, rest] = match;
  return protocol + encodeURIComponent(user) + ':' + encodeURIComponent(password) + '@' + rest;
};

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(encodeMongoURI(MONGO_URI));
  console.log('✅ Connected to MongoDB\n');

  for (const userData of TEST_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      existing.role     = userData.role;
      existing.name     = userData.name;
      existing.bio      = userData.bio;
      existing.password = userData.password;
      await existing.save();
      console.log(`🔄 Updated  [${userData.role.padEnd(7)}]  ${userData.email}`);
    } else {
      const u = new User(userData);
      await u.save();
      console.log(`✨ Created  [${userData.role.padEnd(7)}]  ${userData.email}`);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log('  TEST ACCOUNTS READY');
  console.log('─────────────────────────────────────────');
  console.log('  Role     │ Email               │ Password');
  console.log('  ─────────┼─────────────────────┼──────────────');
  console.log('  Admin    │ admin@test.com       │ Admin@123');
  console.log('  Teacher  │ teacher@test.com     │ Teacher@123');
  console.log('  Student  │ student@test.com     │ Student@123');
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
