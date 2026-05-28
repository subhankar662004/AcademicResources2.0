import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// User Schema (same as User model)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic-hub';

async function createDemoUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create demo user
    const demoEmail = 'user@example.com';
    const demoPassword = 'user123';
    const demoName = 'Demo User';

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: demoEmail });
    if (existingUser) {
      console.log('Demo user already exists');
    } else {
      // Create new demo user
      const demoUser = new User({
        name: demoName,
        email: demoEmail,
        password: demoPassword,
        role: 'user'
      });
      await demoUser.save();
      console.log('Demo user created successfully');
    }

    console.log('\nDemo User Account Details:');
    console.log('Email:', demoEmail);
    console.log('Password:', demoPassword);
    console.log('Role: user');

    // Also create admin if doesn't exist
    const adminEmail = 'shubhankar662004@gmail.com';
    const adminPassword = '662004';
    const adminName = 'Shubhankar';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('\nAdmin user already exists');
      // Update to admin role if exists
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Updated existing user to admin role');
    } else {
      // Create new admin user
      const admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('\nAdmin user created successfully');
    }

    console.log('\nAdmin Account Details:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Role: admin');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDemoUser();
