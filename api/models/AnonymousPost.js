const mongoose = require('mongoose');

const anonymousPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours TTL index: MongoDB automatically purges posts after 24 hours
  }
});

// Index for query sorting
anonymousPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AnonymousPost', anonymousPostSchema);
