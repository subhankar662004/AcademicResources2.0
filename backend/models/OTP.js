import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  name: { type: String },
  password: { type: String },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },
  createdAt: { type: Date, default: Date.now, expires: 600 }
});

export default mongoose.model('OTP', otpSchema);
