const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  weight: {
    type: Number,
    default: null,
  },
  height: {
    type: Number,
    default: null, // en cm
  },
  age: {
    type: Number,
    default: null,
  },
  goal: {
    type: String,
    default: null,
  },
  bodyFat: {
    type: Number,
    default: null, // porcentaje
  },
  muscleMass: {
    type: Number,
    default: null, // en kg
  },
  bodyPhotos: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    url: { type: String, required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['front', 'side', 'back'], default: 'front' },
    notes: String,
  }],
  fitnessLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  trainingExperience: {
    years: {
      type: Number,
      default: 0,
    },
    months: {
      type: Number,
      default: 0,
      min: 0,
      max: 11,
    },
  },
  injuries: [{
    type: String,
    description: String,
  }],
  preferences: {
    workoutDays: [Number], // 0-6 (domingo-sábado)
    preferredTime: String, // morning, afternoon, evening
    equipment: [String], // gym, home, both
  },
  currentPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    default: null,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

