import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
  type: String,
  default: ''
},

category: {
  type: String,
  default: 'CSE',
  trim: true
},

createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},
  isPublic: {
    type: Boolean,
    default: true
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  resourceCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
folderSchema.index({ category: 1, parentFolder: 1 });
export default mongoose.model('Folder', folderSchema);
