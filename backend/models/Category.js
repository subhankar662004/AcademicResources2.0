import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    default: "",
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, {
  timestamps: true
});

const Category = mongoose.model("Category", categorySchema);

export default Category;