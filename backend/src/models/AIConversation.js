const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['chat', 'meal_plan', 'workout_routine'],
    required: true,
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    images: [{ type: String }],
    pdfUrl: { type: String },
  }],
  context: {
    weight: Number,
    height: Number,
    goal: String,
    preferences: [String],
    experience: String,
  },
  metadata: {
    model: String,
    tokensUsed: Number,
    cost: Number,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
aiConversationSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);

