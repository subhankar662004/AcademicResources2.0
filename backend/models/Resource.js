import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  // Cloudinary public ID (optional)
  cloudinaryId: {
    type: String,
    default: ''
  },
  // Content type for the file, mostly informational
  contentType: {
  type: String,
  required: false
},

category: {
  type: String,
  default: 'CSE',
  trim: true
},

folder: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Folder',
  default: null
},
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  downloads: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ category: 1, status: 1, createdAt: -1 });
// optional index on cloudinaryId for cleanup
resourceSchema.index({ cloudinaryId: 1 });

// Export the model
const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;