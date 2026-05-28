import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 60 * 60 * 1000) },
}, { timestamps: false });

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PasswordResetToken', passwordResetTokenSchema);
