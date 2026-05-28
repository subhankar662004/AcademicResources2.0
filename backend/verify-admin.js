import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// User Schema (same as User model)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Add comparePassword method to schema
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic-hub';

async function verifyAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'shubhankar662004@gmail.com';
    const newPassword = '662004';

    // Find user
    const user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log('User not found!');
    } else {
      console.log('User found:', user.email, 'Role:', user.role);
      
      // ensure the user has the admin role
      if (user.role !== 'admin') {
        user.role = 'admin';
        console.log('Promoting user to admin role');
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
      console.log('Password reset successfully');
      
      // Verify
      const user2 = await User.findOne({ email: adminEmail });
      const isMatch = await user2.comparePassword(newPassword);
      console.log('Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyAdmin();
