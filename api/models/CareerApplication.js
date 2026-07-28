const mongoose = require('mongoose');

const CareerApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 300 },
  subject: { type: String, required: true, trim: true, maxlength: 300 },
  body: { type: String, required: true, trim: true, maxlength: 10000 },
  ip: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'reviewed', 'contacted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.CareerApplication || mongoose.model('CareerApplication', CareerApplicationSchema);
