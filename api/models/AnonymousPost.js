const mongoose = require('mongoose');

const anonymousPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  upvotes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  downvotes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  upvotesCount: {
    type: Number,
    default: 0
  },
  downvotesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours TTL index: MongoDB automatically purges posts after 24 hours
  }
});

// Indexes for query sorting and user post quota range scans
anonymousPostSchema.index({ createdAt: -1 });
anonymousPostSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AnonymousPost', anonymousPostSchema);
