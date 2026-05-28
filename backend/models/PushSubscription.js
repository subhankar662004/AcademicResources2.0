import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
