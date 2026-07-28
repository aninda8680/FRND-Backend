const express = require('express');
const router = express.Router();
const CareerApplication = require('../models/CareerApplication');

// Helper to validate email format
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// POST /api/careers/apply & POST /api/careers (Public unauthenticated endpoint for role applications)
async function handleCareerApply(req, res) {
  try {
    const { name, email, subject, body, text } = req.body;
    const applicationBody = body || text;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!applicationBody || typeof applicationBody !== 'string' || applicationBody.trim().length === 0) {
      return res.status(400).json({ error: 'Text body / application message is required' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '';

    const application = new CareerApplication({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      body: applicationBody.trim(),
      ip
    });

    await application.save();

    res.status(201).json({
      message: 'Application submitted successfully! Our team will review your submission soon.',
      applicationId: application._id
    });
  } catch (err) {
    console.error('[CAREER APPLY ERROR]:', err);
    res.status(500).json({ error: 'Server error submitting application' });
  }
}

router.post('/apply', handleCareerApply);
router.post('/', handleCareerApply);

module.exports = router;
