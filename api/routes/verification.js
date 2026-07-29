const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const AccountFlag = require('../models/AccountFlag');
const IdentityVerificationRequest = require('../models/IdentityVerificationRequest');
const { authRequired } = require('../middleware/auth');
const { uploadVerificationImage } = require('../utils/uploader');

// Memory storage for multer — with strict MIME type validation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
    cb(null, true);
  }
});

// Multer error handler middleware
function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message || 'File upload error' });
  }
  next(err);
}

// Helper to handle image verification submissions
async function handleIdentitySubmit(req, res, isResubmit = false) {
  try {
    const files = req.files;
    if (!files || !files.idCard || !files.face) {
      return res.status(400).json({ error: 'Both idCard and face files are required' });
    }

    const idCardFile = files.idCard[0];
    const faceFile = files.face[0];

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (isResubmit && user.identityStatus !== 'unverified') {
      return res.status(400).json({ error: 'You can only resubmit if your verification status is unverified' });
    }

    if (!isResubmit && user.identityStatus !== 'not_submitted') {
      return res.status(400).json({ error: 'Verification request already submitted or verified' });
    }

    // Magic-byte validation: verify actual file content matches allowed image types
    const fileTypeModule = await import('file-type');
    const ft = fileTypeModule.default || fileTypeModule;
    const detectedIdCard = await ft.fromBuffer(idCardFile.buffer);
    const detectedFace = await ft.fromBuffer(faceFile.buffer);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!detectedIdCard || !allowedTypes.includes(detectedIdCard.mime) ||
        !detectedFace || !allowedTypes.includes(detectedFace.mime)) {
      return res.status(400).json({ error: 'Invalid file content. Only real JPEG, PNG, or WebP images are accepted.' });
    }

    // 1. Upload images to Cloudinary / CDN (or local fallback in dev)
    const idCardUpload = await uploadVerificationImage(idCardFile);
    const faceUpload = await uploadVerificationImage(faceFile);

    // 2. Save verification request
    const verificationRequest = new IdentityVerificationRequest({
      userId: user._id,
      idCardImage: idCardUpload,
      faceImage: faceUpload,
      status: 'pending',
      submittedAt: new Date()
    });
    await verificationRequest.save();

    // 3. Update user status to pending
    user.identityStatus = 'pending';
    await user.save();

    // 4. If this is a resubmit, check for repeated rejection flag
    if (isResubmit) {
      const priorRejections = await IdentityVerificationRequest.countDocuments({
        userId: user._id,
        status: 'unverified'
      });
      if (priorRejections >= 2) {
        const flag = new AccountFlag({
          userId: user._id,
          flagType: 'repeated_verification_rejection',
          severity: 'medium',
          details: { priorRejections },
          status: 'open'
        });
        await flag.save();
        await User.findByIdAndUpdate(user._id, { $inc: { openFlagCount: 1 } });
      }
    }

    res.status(201).json({
      message: 'Identity verification request submitted successfully',
      status: 'pending'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during identity verification submission' });
  }
}

// POST /api/verification/identity/submit
router.post('/identity/submit', authRequired,
  (req, res, next) => {
    upload.fields([{ name: 'idCard', maxCount: 1 }, { name: 'face', maxCount: 1 }])(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  (req, res) => handleIdentitySubmit(req, res, false)
);

// POST /api/verification/identity/resubmit
router.post('/identity/resubmit', authRequired,
  (req, res, next) => {
    upload.fields([{ name: 'idCard', maxCount: 1 }, { name: 'face', maxCount: 1 }])(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  (req, res) => handleIdentitySubmit(req, res, true)
);

// GET /api/verification/identity/status
router.get('/identity/status', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const latestRequest = await IdentityVerificationRequest.findOne({ userId: user._id })
      .sort({ submittedAt: -1 })
      .select('status reason submittedAt reviewedAt');

    res.json({
      identityStatus: user.identityStatus,
      requestDetails: latestRequest || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching verification status' });
  }
});

module.exports = router;
