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

let fileTypePromise = null;
async function getFileType() {
  if (!fileTypePromise) {
    fileTypePromise = import('file-type')
      .then(m => m.default || m)
      .catch(err => {
        fileTypePromise = null;
        throw err;
      });
  }
  return fileTypePromise;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per file (lowered to save memory on 512MB RAM free tier)
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
  const expectedStatus = isResubmit ? 'unverified' : 'not_submitted';
  let statusLocked = false;

  try {
    const files = req.files;
    if (!files || !files.idCard || !files.face) {
      return res.status(400).json({ error: 'Both idCard and face files are required' });
    }

    const idCardFile = files.idCard[0];
    const faceFile = files.face[0];

    // Atomic status transition lock: prevents race condition on double submission
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, identityStatus: expectedStatus },
      { $set: { identityStatus: 'pending' } },
      { new: true }
    );

    if (!user) {
      const currentUser = await User.findById(req.user.id).select('identityStatus').lean();
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (currentUser.identityStatus === 'pending') {
        return res.status(400).json({ error: 'Verification request is already pending review' });
      }
      if (isResubmit && currentUser.identityStatus !== 'unverified') {
        return res.status(400).json({ error: 'You can only resubmit if your verification status is unverified' });
      }
      return res.status(400).json({ error: 'Verification request already submitted or verified' });
    }

    statusLocked = true;

    // Magic-byte validation: verify actual file content matches allowed image types
    const ft = await getFileType();
    const detectedIdCard = await ft.fromBuffer(idCardFile.buffer);
    const detectedFace = await ft.fromBuffer(faceFile.buffer);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!detectedIdCard || !allowedTypes.includes(detectedIdCard.mime) ||
        !detectedFace || !allowedTypes.includes(detectedFace.mime)) {
      await User.findByIdAndUpdate(req.user.id, { $set: { identityStatus: expectedStatus } });
      return res.status(400).json({ error: 'Invalid file content. Only real JPEG, PNG, or WebP images are accepted.' });
    }

    // 1. Parallel upload images to Cloudinary / CDN
    const [idCardUpload, faceUpload] = await Promise.all([
      uploadVerificationImage(idCardFile),
      uploadVerificationImage(faceFile)
    ]);

    // 2. Save verification request
    const verificationRequest = new IdentityVerificationRequest({
      userId: user._id,
      idCardImage: idCardUpload,
      faceImage: faceUpload,
      status: 'pending',
      submittedAt: new Date()
    });
    await verificationRequest.save();

    // 3. If this is a resubmit, check for repeated rejection flag
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
    if (statusLocked) {
      await User.findByIdAndUpdate(req.user.id, { $set: { identityStatus: expectedStatus } }).catch(() => {});
    }
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
    const user = await User.findById(req.user.id).select('identityStatus').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const latestRequest = await IdentityVerificationRequest.findOne({ userId: user._id })
      .sort({ submittedAt: -1 })
      .select('status reason submittedAt reviewedAt')
      .lean();

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
