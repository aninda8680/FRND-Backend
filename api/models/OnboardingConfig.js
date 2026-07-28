const mongoose = require('mongoose');

const onboardingConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'default_onboarding_config',
    unique: true
  },
  segments: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  sections: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OnboardingConfig', onboardingConfigSchema);
