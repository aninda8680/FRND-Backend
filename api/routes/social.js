const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Like = require('../models/Like');
const Dislike = require('../models/Dislike');
const Match = require('../models/Match');
const Block = require('../models/Block');
const Report = require('../models/Report');
const AccountFlag = require('../models/AccountFlag');
const AnonymousPost = require('../models/AnonymousPost');
const Feedback = require('../models/Feedback');
const redis = require('../utils/redis');
const { authRequired } = require('../middleware/auth');
const { getOrInitOnboardingConfig, formatUserInterests, formatUserPrompts } = require('../utils/onboardingConfig');
const emailService = require('../utils/emailService');

// GET /api/config/onboarding (Fetch onboarding interests segments and prompt sections for frontend UI)
router.get('/config/onboarding', async (req, res) => {
  try {
    const config = await getOrInitOnboardingConfig();
    res.json({
      segments: config.segments,
      sections: config.sections
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching onboarding options' });
  }
});

// Helper to calculate seconds until next UTC midnight
function getSecondsToUTCMidnight() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000);
}

// Input length validation helper
function validateStringLength(value, maxLength) {
  return typeof value === 'string' && value.length <= maxLength;
}

const multer = require('multer');
const { uploadProfilePicture } = require('../utils/uploader');

// Memory storage for multer profile picture upload — with strict MIME type validation
const uploadPicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
  }
});

// Multer error handler middleware helper
function handleMulterError(err, req, res, next) {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// ------------------------------------------------------------------
// 1. OWN PROFILE
// ------------------------------------------------------------------

// POST /api/upload/picture (Upload normal profile picture, returns url and fileId)
router.post('/upload/picture', authRequired, uploadPicture.single('picture'), handleMulterError, async (req, res) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({ error: 'Please select an image file to upload (field name: "picture" or "file")' });
    }

    // Magic-byte validation: verify actual file content matches claimed MIME type
    // Prevents MIME spoofing (uploading .exe/.php with Content-Type: image/jpeg)
    const fileTypeModule = await import('file-type');
    const ft = fileTypeModule.default || fileTypeModule;
    const detected = await ft.fromBuffer(file.buffer);
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!detected || !allowedMimeTypes.includes(detected.mime)) {
      return res.status(400).json({ error: 'Invalid file content. Only real JPEG, PNG, WEBP, or GIF images are allowed.' });
    }

    const picture = await uploadProfilePicture(file);

    // Optional: auto-append to user profile pictures array if requested
    if (req.body && (req.body.autoSave === 'true' || req.body.autoSave === true)) {
      const user = await User.findById(req.user.id);
      if (user) {
        if (user.pictures.length >= 4) {
          return res.status(400).json({ error: 'User already has maximum 4 pictures. Update profile array directly.', picture });
        }
        user.pictures.push(picture);
        await user.save();
      }
    }

    res.status(201).json({
      message: 'Picture uploaded successfully',
      picture: {
        url: picture.url,
        fileId: picture.fileId
      }
    });
  } catch (err) {
    console.error('[PICTURE UPLOAD ERROR]:', err);
    res.status(500).json({ error: 'Server error uploading profile picture' });
  }
});

// GET /api/users/me
router.get('/users/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// PUT /api/users/me
router.put('/users/me', authRequired, async (req, res) => {
  try {
    const { username, name, age, bio, school, course, height, hobbies, skills, lookingFor, sexualOrientation, tags, pictures, interests, prompts, religion, beliefs } = req.body;

    // Input validation
    if (username !== undefined) {
      if (!validateStringLength(username, 50)) return res.status(400).json({ error: 'Username too long (max 50 chars)' });
      const cleanUsername = username.toLowerCase().trim();
      const exists = await User.findOne({ username: cleanUsername, _id: { $ne: req.user.id } });
      if (exists) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    if (name !== undefined) {
      if (!validateStringLength(name, 100)) return res.status(400).json({ error: 'Name too long (max 100 chars)' });
    }
    if (age !== undefined && age !== null && age !== '') {
      const finalAge = parseInt(age, 10);
      if (isNaN(finalAge) || finalAge < 18) {
        return res.status(400).json({ error: 'You must be at least 18 years old' });
      }
    }
    if (bio !== undefined) {
      if (!validateStringLength(bio, 500)) return res.status(400).json({ error: 'Bio too long (max 500 chars)' });
    }
    if (religion !== undefined && !validateStringLength(religion, 100)) {
      return res.status(400).json({ error: 'Religion too long (max 100 chars)' });
    }
    if (beliefs !== undefined && !validateStringLength(beliefs, 200)) {
      return res.status(400).json({ error: 'Beliefs too long (max 200 chars)' });
    }
    if (school !== undefined && !validateStringLength(school, 150)) {
      return res.status(400).json({ error: 'School name too long (max 150 chars)' });
    }
    if (course !== undefined && !validateStringLength(course, 150)) {
      return res.status(400).json({ error: 'Course name too long (max 150 chars)' });
    }
    if (hobbies !== undefined && (!Array.isArray(hobbies) || hobbies.length > 20)) {
      return res.status(400).json({ error: 'Hobbies must be an array with at most 20 items' });
    }
    if (skills !== undefined && (!Array.isArray(skills) || skills.length > 20)) {
      return res.status(400).json({ error: 'Skills must be an array with at most 20 items' });
    }
    if (interests !== undefined && !Array.isArray(interests)) {
      return res.status(400).json({ error: 'Interests must be an array' });
    }
    if (prompts !== undefined && !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Prompts must be an array' });
    }
    if (pictures !== undefined) {
      if (!Array.isArray(pictures) || pictures.length > 4) {
        return res.status(400).json({ error: 'Pictures must be an array with at most 4 items' });
      }
      for (const pic of pictures) {
        if (!pic.url || !pic.fileId) {
          return res.status(400).json({ error: 'Each picture must have url and fileId fields' });
        }
      }
    }

    // Whitelist of updatable fields — never allow email, passwordHash, banned, etc.
    const allowedUpdates = {};
    if (username !== undefined) allowedUpdates.username = username.toLowerCase().trim();
    if (name !== undefined) allowedUpdates.name = name.trim();
    if (age !== undefined && age !== null && age !== '') allowedUpdates.age = parseInt(age, 10);
    if (bio !== undefined) allowedUpdates.bio = bio.trim();
    if (religion !== undefined) allowedUpdates.religion = religion.trim();
    if (beliefs !== undefined) allowedUpdates.beliefs = beliefs.trim();
    if (school !== undefined) allowedUpdates.school = school.trim();
    if (course !== undefined) allowedUpdates.course = course.trim();
    if (height !== undefined && typeof height === 'number') allowedUpdates.height = height;
    if (hobbies !== undefined) allowedUpdates.hobbies = hobbies.map(h => String(h).trim()).filter(Boolean);
    if (skills !== undefined) allowedUpdates.skills = skills.map(s => String(s).trim()).filter(Boolean);
    if (lookingFor !== undefined && ['friends', 'dating'].includes(lookingFor)) allowedUpdates.lookingFor = lookingFor;
    if (sexualOrientation !== undefined && validateStringLength(sexualOrientation, 50)) allowedUpdates.sexualOrientation = sexualOrientation;
    if (tags !== undefined && typeof tags === 'object' && !Array.isArray(tags)) allowedUpdates.tags = tags;
    if (pictures !== undefined) allowedUpdates.pictures = pictures;

    if (interests !== undefined || prompts !== undefined) {
      const config = await getOrInitOnboardingConfig();
      if (interests !== undefined) {
        allowedUpdates.interests = formatUserInterests(interests, config);
      }
      if (prompts !== undefined) {
        allowedUpdates.prompts = formatUserPrompts(prompts, config);
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate discovery cache for this user
    await redis.del(`discover:${req.user.id}`);

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// ------------------------------------------------------------------
// 2. DISCOVERY FEED
// ------------------------------------------------------------------
const DISCOVER_CACHE_TTL = 300; // 5 minutes — balances freshness vs DB load

// GET /api/discover
router.get('/discover', authRequired, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // --- Cache read: try to serve ranked candidates from Redis before DB ---
    const cacheKey = `discover:${req.user.id}`;
    let scoredProfiles = null;

    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        scoredProfiles = JSON.parse(cached);
      } catch (_) {
        scoredProfiles = null; // corrupt cache — fall through to DB
      }
    }

    if (!scoredProfiles) {
      // A-C: Fetch blocks, likes/dislikes, matches in parallel — 1 round-trip instead of 4
      const [blocks, sentLikes, sentDislikes, matches] = await Promise.all([
        Block.find({ $or: [{ blockerId: userId }, { blockedId: userId }] }).lean(),
        Like.find({ fromUserId: userId }).select('toUserId').lean(),
        Dislike.find({ fromUserId: userId }).select('toUserId').lean(),
        Match.find({ $or: [{ userA: userId }, { userB: userId }] }).lean()
      ]);

      const blockedUserIds = blocks.map(b => String(b.blockerId) === String(userId) ? b.blockedId : b.blockerId);
      const likedUserIds = sentLikes.map(l => l.toUserId);
      const dislikedUserIds = sentDislikes.map(d => d.toUserId);
      const matchedUserIds = matches.map(m => String(m.userA) === String(userId) ? m.userB : m.userA);

      // D. Build complete exclusion list (Self, Blocked, Liked, Disliked, Matched)
      const excludedIds = [userId, ...blockedUserIds, ...likedUserIds, ...dislikedUserIds, ...matchedUserIds];

      // E. Discovery query
      const query = {
        _id: { $nin: excludedIds },
        banned: false
      };

      // Basic gender preferences for dating mode
      if (user.lookingFor === 'dating') {
        if (user.gender === 'male') query.gender = 'female';
        else if (user.gender === 'female') query.gender = 'male';
      }

      // .lean() = plain JS objects, ~70% less RAM than Mongoose docs
      // .limit(200) = safety cap: with 700 users we never need to load all into RAM
      const candidateProfiles = await User.find(query)
        .select('name age height school course gender pictures bio hobbies skills lookingFor sexualOrientation identityStatus badges tier subscriptionExpiresAt religion beliefs')
        .limit(200)
        .lean();

      // F. Probability-based Feed Algorithm with 6x/3x/1x Profile Boost
      const now = new Date();
      scoredProfiles = candidateProfiles.map(p => {
        const isSubActive = p.tier && p.tier !== 'free' && (!p.subscriptionExpiresAt || new Date(p.subscriptionExpiresAt) > now);
        const activeTier = isSubActive ? p.tier : 'free';

        // Boost multiplier: Gold = 6x, Silver = 3x, Free = 1x
        const boostMultiplier = activeTier === 'gold' ? 6 : (activeTier === 'silver' ? 3 : 1);
        const weightedScore = (boostMultiplier * 1000) + Math.floor(Math.random() * 500);

        const doc = { ...p };
        delete doc.subscriptionExpiresAt;
        return { profile: doc, score: weightedScore };
      });

      // Sort by weighted rank score descending
      scoredProfiles.sort((a, b) => b.score - a.score);

      // --- Cache write: store sorted list for 5 minutes ---
      await redis.set(cacheKey, JSON.stringify(scoredProfiles), { EX: DISCOVER_CACHE_TTL });
    }

    // Apply pagination slice
    const paginatedProfiles = scoredProfiles.slice(skip, skip + limit).map(item => item.profile);

    res.json({ profiles: paginatedProfiles, page, limit, total: scoredProfiles.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during discovery fetch' });
  }
});




// ------------------------------------------------------------------
// 3. LIKES & SUPERLIKES
// ------------------------------------------------------------------
async function handleLikeAction(req, res, actionType) {
  try {
    const fromUserId = new mongoose.Types.ObjectId(req.user.id);
    const toUserId = new mongoose.Types.ObjectId(req.params.targetId);

    if (fromUserId.equals(toUserId)) {
      return res.status(400).json({ error: 'You cannot like yourself' });
    }

    // A. Fetch both users in parallel — saves one DB round-trip on the hottest path
    const [target, user] = await Promise.all([
      User.findById(toUserId),
      User.findById(fromUserId)
    ]);

    if (!target || target.banned) {
      return res.status(404).json({ error: 'Target user not found or is banned' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // B. Check block status (either direction)
    const isBlocked = await Block.findOne({
      $or: [
        { blockerId: fromUserId, blockedId: toUserId },
        { blockerId: toUserId, blockedId: fromUserId }
      ]
    });
    if (isBlocked) {
      return res.status(400).json({ error: 'Action blocked' });
    }

    // C. Quota enforcement via Tier Subscription & Redis
    const secondsToMidnight = getSecondsToUTCMidnight();
    const now = new Date();
    
    // Determine active subscription tier
    const isSubActive = user.tier && user.tier !== 'free' && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > now);
    const activeTier = isSubActive ? user.tier : 'free';

    let likeLimit = 15;
    let superlikeLimit = 3;

    if (activeTier === 'gold') {
      likeLimit = 50;
      superlikeLimit = 12;
    } else if (activeTier === 'silver') {
      likeLimit = 25;
      superlikeLimit = 6;
    } else {
      likeLimit = 15;
      superlikeLimit = 3;
    }

    if (actionType === 'like') {
      const likeKey = `user:${fromUserId}:likes`;
      const currentLikes = await redis.incr(likeKey);
      if (currentLikes === 1) {
        await redis.expire(likeKey, secondsToMidnight);
      }
      if (currentLikes > likeLimit) {
        return res.status(429).json({ error: `Daily likes quota exceeded for ${activeTier.toUpperCase()} tier (${likeLimit} likes/day max). Upgrade to get more!` });
      }
    } else if (actionType === 'superlike') {
      const superlikeKey = `user:${fromUserId}:superlikes`;
      const currentSuperlikes = await redis.incr(superlikeKey);
      if (currentSuperlikes === 1) {
        await redis.expire(superlikeKey, secondsToMidnight);
      }
      if (currentSuperlikes > superlikeLimit) {
        return res.status(429).json({ error: `Daily superlikes quota exceeded for ${activeTier.toUpperCase()} tier (${superlikeLimit} superlikes/day max). Upgrade to get more!` });
      }
    }

    // D. Velocity Check (sorted set of timestamps — flag bot-like pacing)
    const nowMs = Date.now();
    const velocityKey = `user:${fromUserId}:like_velocity`;
    await redis.zAdd(velocityKey, nowMs, String(nowMs));
    await redis.zRemRangeByScore(velocityKey, 0, nowMs - 10000); // 10s window
    const recentLikesCount = await redis.zCount(velocityKey, nowMs - 10000, nowMs);

    if (recentLikesCount > 5) {
      const flag = new AccountFlag({
        userId: fromUserId,
        flagType: 'like_velocity_spike',
        severity: 'low',
        details: { count: recentLikesCount, action: actionType },
        status: 'open'
      });
      await flag.save();
      await User.findByIdAndUpdate(fromUserId, { $inc: { openFlagCount: 1 } });
    }

    // E. Check for mutual like BEFORE upserting own like
    // This is critical — we need to know if the other user already liked us
    // BEFORE we write our like, so that a concurrent duplicate upsert can't
    // swallow the match-formed state in the outer catch block.
    const mutualLike = await Like.findOne({ fromUserId: toUserId, toUserId: fromUserId }).lean();

    // F. Save/upsert own Like document (one like per pair)
    await Like.findOneAndUpdate(
      { fromUserId, toUserId },
      { type: actionType, createdAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // G. Mutual Match Formation
    let matchFormed = false;
    let conversationId = null;

    if (mutualLike) {
      matchFormed = true;
      // conversationId is deterministic — always the same regardless of who liked first
      conversationId = `conv_${[fromUserId.toString(), toUserId.toString()].sort().join('_')}`;

      // Upsert match (idempotent — safe to call even if match already exists)
      const existingOrNewMatch = await Match.findOneAndUpdate(
        {
          $or: [
            { userA: fromUserId, userB: toUserId },
            { userA: toUserId, userB: fromUserId }
          ]
        },
        {
          $setOnInsert: {
            userA: fromUserId.toString() < toUserId.toString() ? fromUserId : toUserId,
            userB: fromUserId.toString() < toUserId.toString() ? toUserId : fromUserId,
            conversationId,
            matchedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      // Use the stored conversationId in case match already existed with a different one
      if (existingOrNewMatch && existingOrNewMatch.conversationId) {
        conversationId = existingOrNewMatch.conversationId;
      }

      // Invalidate both users' discovery caches — they should no longer see each other
      await Promise.all([
        redis.del(`discover:${fromUserId.toString()}`),
        redis.del(`discover:${toUserId.toString()}`)
      ]);

      console.log(`[MATCH] Mutual match formed: ${fromUserId} <-> ${toUserId} | conversation: ${conversationId}`);
    }

    // H. Broadcast real-time WebSocket notification events via Chat Service

    try {
      const chatUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:5001';
      const payload = matchFormed
        ? { event: 'new_match', userA: fromUserId.toString(), userB: toUserId.toString(), conversationId, timestamp: new Date() }
        : { event: 'new_like', toUserId: toUserId.toString(), fromUserId: fromUserId.toString(), type: actionType, timestamp: new Date() };

      const http = require('http');
      const https = require('https');
      const targetUrl = new URL(`${chatUrl}/internal/notify`);
      const transport = targetUrl.protocol === 'https:' ? https : http;
      const dataString = JSON.stringify(payload);

      const notifReq = transport.request(targetUrl, {
        method: 'POST',
        timeout: 1500,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString),
          'x-internal-secret': process.env.INTERNAL_NOTIFY_SECRET || ''
        }
      });
      notifReq.setTimeout(1500, () => {
        notifReq.destroy();
      });
      notifReq.on('error', (e) => console.warn('[SOCKET NOTIF DISPATCH WARN]:', e.message || e.code || 'Chat service offline/timeout'));
      notifReq.write(dataString);
      notifReq.end();

      await redis.publish('events:notifications', payload).catch(() => {});
    } catch (pubErr) {
      console.error('[NOTIF PUB ERROR]:', pubErr.message);
    }

    res.json({ success: true, matchFormed, conversationId });
  } catch (err) {
    // E11000 here means user submitted a duplicate like request (re-liked same profile).
    // The mutual match check was already done BEFORE the Like upsert, so this can't
    // suppress a match that should have formed — it's safe to return 'Already liked'.
    if (err.code === 11000) {
      return res.json({ success: true, matchFormed: false, note: 'Already liked' });
    }
    console.error('[LIKE ACTION ERROR]:', err);
    res.status(500).json({ error: 'Server error during like action' });
  }
}

// POST /api/dislike/:targetId & POST /api/pass/:targetId (Left swipe / pass profile)
async function handleDislikeAction(req, res) {
  try {
    const fromUserId = new mongoose.Types.ObjectId(req.user.id);
    const toUserId = new mongoose.Types.ObjectId(req.params.targetId);

    if (fromUserId.equals(toUserId)) {
      return res.status(400).json({ error: 'You cannot pass yourself' });
    }

    // Save dislike record (upsert)
    await Dislike.findOneAndUpdate(
      { fromUserId, toUserId },
      { createdAt: new Date() },
      { upsert: true }
    );

    // Invalidate cached discovery feed
    await redis.del(`discover:${req.user.id}`);

    res.json({ success: true, message: 'Profile passed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error processing pass/dislike' });
  }
}

// GET /api/likes/received & GET /api/likes/incoming
// Returns incoming likes that other users have sent to the authenticated user.
// - Free users: returns total like count only (`hasAccess: false`, `isLocked: true`, `likers: []`).
// - Silver / Gold subscription users: returns total count AND full profiles of likers (`hasAccess: true`, `isLocked: false`, `likers: [...]`).
async function getReceivedLikes(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine active subscription status
    const now = new Date();
    const isSubActive = user.tier && user.tier !== 'free' && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > now);

    // 1. Get blocked user IDs (both directions)
    const blocks = await Block.find({
      $or: [{ blockerId: userId }, { blockedId: userId }]
    }).lean();
    const blockedUserIds = blocks.map(b => String(b.blockerId) === String(userId) ? b.blockedId : b.blockerId);

    // 2. Get existing matches (already matched users)
    const matches = await Match.find({
      $or: [{ userA: userId }, { userB: userId }]
    }).lean();
    const matchedUserIds = matches.map(m => String(m.userA) === String(userId) ? m.userB : m.userA);

    // Exclude blocked & already matched users
    const excludedIds = [...blockedUserIds, ...matchedUserIds];

    // 3. Find incoming likes sent TO this user
    const incomingLikes = await Like.find({
      toUserId: userId,
      fromUserId: { $nin: excludedIds }
    }).sort({ createdAt: -1 }).lean();

    const totalLikesCount = incomingLikes.length;

    // If free tier, return total count only — keep profiles hidden/locked
    if (!isSubActive) {
      return res.json({
        totalLikesCount,
        hasAccess: false,
        isLocked: true,
        tier: user.tier || 'free',
        message: 'Upgrade to Silver or Gold Pass to unlock and see full profiles of users who liked you!',
        likers: []
      });
    }

    // If Silver or Gold subscription active, batch-fetch all liker profiles in ONE query
    const likerIds = incomingLikes.map(l => l.fromUserId);
    const likerUsers = await User.find({ _id: { $in: likerIds }, banned: false })
      .select('name age height school course gender pictures bio hobbies skills lookingFor sexualOrientation identityStatus badges tier religion beliefs')
      .lean();
    const likerMap = Object.fromEntries(likerUsers.map(u => [u._id.toString(), u]));

    const validLikers = incomingLikes
      .map(l => {
        const profile = likerMap[l.fromUserId.toString()];
        if (!profile) return null;
        return { likeId: l._id, type: l.type || 'like', likedAt: l.createdAt, profile };
      })
      .filter(Boolean);

    res.json({
      totalLikesCount: validLikers.length,
      hasAccess: true,
      isLocked: false,
      tier: user.tier,
      likers: validLikers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching received likes' });
  }
}

router.post('/like/:targetId', authRequired, (req, res) => handleLikeAction(req, res, 'like'));
router.post('/superlike/:targetId', authRequired, (req, res) => handleLikeAction(req, res, 'superlike'));
router.post('/dislike/:targetId', authRequired, handleDislikeAction);
router.post('/pass/:targetId', authRequired, handleDislikeAction);
router.get('/likes/received', authRequired, getReceivedLikes);
router.get('/likes/incoming', authRequired, getReceivedLikes);

// GET /api/likes/given & GET /api/likes/sent
// Returns history of all accounts liked/superliked in the past by the authenticated user.
async function getGivenLikes(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    // 1. Get blocked user IDs (both directions)
    const blocks = await Block.find({
      $or: [{ blockerId: userId }, { blockedId: userId }]
    });
    const blockedUserIds = blocks.map(b => b.blockerId.equals(userId) ? b.blockedId : b.blockerId);

    // 2. Query sent likes
    const filter = {
      fromUserId: userId,
      toUserId: { $nin: blockedUserIds }
    };

    const [sentLikes, total] = await Promise.all([
      Like.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Like.countDocuments(filter)
    ]);

    // 3. Batch-fetch all target profiles in ONE query instead of N queries
    const targetIds = sentLikes.map(l => l.toUserId);
    const targetUsers = await User.find({ _id: { $in: targetIds }, banned: false })
      .select('name age height school course gender pictures bio hobbies skills lookingFor sexualOrientation identityStatus badges tier religion beliefs')
      .lean();
    const targetMap = Object.fromEntries(targetUsers.map(u => [u._id.toString(), u]));

    const validLikes = sentLikes
      .map(l => {
        const profile = targetMap[l.toUserId.toString()];
        if (!profile) return null;
        return { likeId: l._id, type: l.type || 'like', likedAt: l.createdAt, profile };
      })
      .filter(Boolean);

    res.json({
      totalCount: total,
      page,
      limit,
      likes: validLikes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching sent likes history' });
  }
}

router.get('/likes/given', authRequired, getGivenLikes);
router.get('/likes/sent', authRequired, getGivenLikes);

// ------------------------------------------------------------------
// 4. MATCHES LIST
// ------------------------------------------------------------------
// GET /api/matches
router.get('/matches', authRequired, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Get all block relationships for this user
    const blocks = await Block.find({
      $or: [{ blockerId: userId }, { blockedId: userId }]
    });
    const blockedSet = new Set(blocks.map(b =>
      b.blockerId.equals(userId) ? b.blockedId.toString() : b.blockerId.toString()
    ));

    const matches = await Match.find({
      $or: [{ userA: userId }, { userB: userId }]
    }).sort({ matchedAt: -1 }).lean();

    // Filter out blocked partners early
    const visibleMatches = matches.filter(m => {
      const partnerId = m.userA.toString() === req.user.id ? m.userB : m.userA;
      return !blockedSet.has(partnerId.toString());
    });

    // Batch-fetch all partner profiles in ONE query
    const partnerIds = visibleMatches.map(m =>
      m.userA.toString() === req.user.id ? m.userB : m.userA
    );
    const partnerUsers = await User.find({ _id: { $in: partnerIds } })
      .select('name age school course gender pictures bio badges identityStatus')
      .lean();
    const partnerMap = Object.fromEntries(partnerUsers.map(u => [u._id.toString(), u]));

    // Batch-fetch all presence keys in parallel (one Upstash HTTP call each, but concurrent)
    const presenceResults = await Promise.all(
      partnerIds.map(id => redis.get(`presence:${id.toString()}`))
    );
    const presenceMap = Object.fromEntries(
      partnerIds.map((id, i) => [id.toString(), !!presenceResults[i]])
    );

    const populatedMatches = visibleMatches
      .map(m => {
        const partnerId = m.userA.toString() === req.user.id ? m.userB : m.userA;
        const partner = partnerMap[partnerId.toString()];
        if (!partner) return null;
        return {
          id: m._id,
          matchedAt: m.matchedAt,
          conversationId: m.conversationId,
          partner: { ...partner, isOnline: presenceMap[partnerId.toString()] || false }
        };
      })
      .filter(Boolean);

    res.json({ matches: populatedMatches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching matches' });
  }
});

// ------------------------------------------------------------------
// 5. BLOCKING
// ------------------------------------------------------------------
// POST /api/block/:targetId
router.post('/block/:targetId', authRequired, async (req, res) => {
  try {
    const blockerId = new mongoose.Types.ObjectId(req.user.id);
    const blockedId = new mongoose.Types.ObjectId(req.params.targetId);

    if (blockerId.equals(blockedId)) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    await Block.findOneAndUpdate(
      { blockerId, blockedId },
      { createdAt: new Date() },
      { upsert: true }
    );

    // Mass Block Target Flagging (medium severity)
    const blockCountKey = `block_count:${blockedId}`;
    const recentBlocks = await redis.incr(blockCountKey);
    if (recentBlocks === 1) {
      await redis.expire(blockCountKey, 3600); // 1 hour window
    }

    if (recentBlocks > 10) {
      const flag = new AccountFlag({
        userId: blockedId,
        flagType: 'mass_block_target',
        severity: 'medium',
        details: { blockCount: recentBlocks },
        status: 'open'
      });
      await flag.save();
      await User.findByIdAndUpdate(blockedId, { $inc: { openFlagCount: 1 } });
    }

    res.json({ message: 'User blocked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during block' });
  }
});

// DELETE /api/block/:targetId
router.delete('/block/:targetId', authRequired, async (req, res) => {
  try {
    const blockerId = new mongoose.Types.ObjectId(req.user.id);
    const blockedId = new mongoose.Types.ObjectId(req.params.targetId);

    await Block.deleteOne({ blockerId, blockedId });
    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during unblock' });
  }
});

// ------------------------------------------------------------------
// 6. REPORTING
// ------------------------------------------------------------------
// POST /api/report
router.post('/report', authRequired, async (req, res) => {
  try {
    const reporterId = new mongoose.Types.ObjectId(req.user.id);
    const { targetUserId, targetPostId, reason } = req.body;

    if (!reason || !validateStringLength(reason, 1000)) {
      return res.status(400).json({ error: 'Reason is required (max 1000 chars)' });
    }

    if (!targetUserId && !targetPostId) {
      return res.status(400).json({ error: 'Either targetUserId or targetPostId is required' });
    }

    const report = new Report({
      reporterId,
      targetUserId: targetUserId ? new mongoose.Types.ObjectId(targetUserId) : undefined,
      targetPostId: targetPostId ? new mongoose.Types.ObjectId(targetPostId) : undefined,
      reason: reason.trim(),
      status: 'open'
    });
    await report.save();

    // Mass Report Target Flagging (high severity)
    if (targetUserId) {
      const reportCountKey = `report_count:${targetUserId}`;
      const recentReports = await redis.incr(reportCountKey);
      if (recentReports === 1) {
        await redis.expire(reportCountKey, 3600); // 1 hour window
      }

      if (recentReports > 5) {
        const flag = new AccountFlag({
          userId: new mongoose.Types.ObjectId(targetUserId),
          flagType: 'mass_report_target',
          severity: 'high',
          details: { reportCount: recentReports },
          status: 'open'
        });
        await flag.save();
        await User.findByIdAndUpdate(targetUserId, { $inc: { openFlagCount: 1 } });
      }
    }

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error submitting report' });
  }
});

// ------------------------------------------------------------------
// 7. ANONYMOUS POSTS
// ------------------------------------------------------------------
const POST_SPAM_THRESHOLD = 5;
// ------------------------------------------------------------------
// 7. ANONYMOUS POSTS & MESSAGES
// ------------------------------------------------------------------
// Tier Posting Limits per 24 hours: Free = 1, Silver = 2, Gold = 3
const TIER_ANONYMOUS_POST_LIMITS = { free: 1, silver: 2, gold: 3 };

// POST /api/posts (Publish anonymous message with tier quota check)
router.post('/posts', authRequired, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const user = await User.findById(userId).lean();
    if (!user || user.banned) {
      return res.status(403).json({ error: 'Account suspended or not found' });
    }

    // 1. Calculate active tier (Free = 1, Silver = 2, Gold = 3)
    const now = new Date();
    const isSubActive = user.tier && user.tier !== 'free' && (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > now);
    const activeTier = isSubActive ? user.tier : 'free';
    const dailyLimit = TIER_ANONYMOUS_POST_LIMITS[activeTier] || 1;

    // 2. Check posts published in rolling 24-hour window
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPostsCount = await AnonymousPost.countDocuments({
      userId,
      createdAt: { $gte: twentyFourHoursAgo }
    });

    if (recentPostsCount >= dailyLimit) {
      return res.status(429).json({
        error: `Daily limit reached (${dailyLimit} post${dailyLimit > 1 ? 's' : ''}/24h for ${activeTier.toUpperCase()} tier). Upgrade your plan or try again in 24 hours.`,
        tier: activeTier,
        dailyLimit,
        used: recentPostsCount
      });
    }

    // 3. Input validation
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ error: 'Post content too long (max 500 chars)' });
    }

    // 4. Save anonymous post
    const post = new AnonymousPost({
      userId,
      content: content.trim(),
      createdAt: new Date()
    });
    await post.save();

    // 5. Post spam flagging
    const spamKey = `post_spam:${req.user.id}`;
    const postCount = await redis.incr(spamKey);
    if (postCount === 1) {
      await redis.expire(spamKey, POST_SPAM_WINDOW_SECONDS);
    }
    if (postCount > POST_SPAM_THRESHOLD) {
      const flag = new AccountFlag({
        userId,
        flagType: 'post_spam',
        severity: 'low',
        details: { postCount, windowSeconds: POST_SPAM_WINDOW_SECONDS },
        status: 'open'
      });
      await flag.save();
      await User.findByIdAndUpdate(userId, { $inc: { openFlagCount: 1 } });
    }

    res.status(201).json({
      message: 'Anonymous post published successfully',
      post: {
        id: post._id,
        content: post.content,
        createdAt: post.createdAt
      },
      tier: activeTier,
      remainingPosts: dailyLimit - (recentPostsCount + 1)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating post' });
  }
});

// GET /api/posts (Fetch anonymous feed — accessible to all authenticated users, auto-purges after 24h)
router.get('/posts', authRequired, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // Filter to only return posts created within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filter = { createdAt: { $gte: twentyFourHoursAgo } };

    const [posts, total] = await Promise.all([
      AnonymousPost.find(filter)
        .select('_id content createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnonymousPost.countDocuments(filter)
    ]);

    res.json({ posts, page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching posts' });
  }
});

// ------------------------------------------------------------------
// 8. FEEDBACK
// ------------------------------------------------------------------
// POST /api/feedback
router.post('/feedback', authRequired, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !validateStringLength(content, 2000)) {
      return res.status(400).json({ error: 'Feedback content is required (max 2000 chars)' });
    }

    const feedback = new Feedback({
      userId: new mongoose.Types.ObjectId(req.user.id),
      content: content.trim()
    });
    await feedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error submitting feedback' });
  }
});

// GET /api/conversations/:conversationId/messages (Chat History)
router.get('/conversations/:conversationId/messages', authRequired, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Security check: ensure requesting user is part of this match
    const match = await Match.findOne({ conversationId });
    if (!match) {
      return res.status(404).json({ error: 'Conversation not found or not matched' });
    }

    if (match.userA.toString() !== userId && match.userB.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const Message = require('../models/Message');
    const [messages, total] = await Promise.all([
      Message.find({ conversationId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId })
    ]);

    res.json({ messages, page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// GET /api/announcements (Announcements list for regular users)
router.get('/announcements', authRequired, async (req, res) => {
  try {
    const Announcement = require('../models/Announcement');
    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
});

// POST /api/waitlist (Public waitlist sign-up with client IP & fingerprinting)
router.post('/waitlist', async (req, res) => {
  try {
    const {
      email,
      userAgent,
      language,
      platform,
      screenResolution,
      referrer,
      country,
      region,
      city
    } = req.body;

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '127.0.0.1';

    const Waitlist = require('../models/Waitlist');

    // 1. IP uniqueness check
    const existingIp = await Waitlist.findOne({ ip });
    if (existingIp) {
      return res.status(400).json({ error: 'This device has already joined the waitlist.' });
    }

    // 2. Email validation (if provided)
    let cleanEmail = null;
    if (email) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email is required' });
      }
      cleanEmail = email.trim().toLowerCase();

      // Check if email already on waitlist
      const existingEmail = await Waitlist.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already on the waitlist.' });
      }
    }

    // Fallback detection for country using Render/Cloudflare geo headers
    const detectedCountry = country || req.headers['cf-ipcountry'] || req.headers['x-appengine-country'] || undefined;

    // 3. Save entry
    const entry = new Waitlist({
      ip,
      email: cleanEmail || undefined,
      userAgent,
      language,
      platform,
      screenResolution,
      referrer,
      country: detectedCountry,
      region,
      city
    });
    await entry.save();

    // 4. Send confirmation email (only if email was supplied)
    if (cleanEmail) {
      const subject = "Welcome to FRND";
      const html = `
        <div style="background-color: #FDF6EA; padding: 40px 16px; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #FEFDFD; border: 2px solid #040404; border-radius: 24px; box-shadow: 4px 6px 0px #040404; overflow: hidden;">
            
            <!-- Top Branding Banner -->
            <div style="padding: 32px 32px 24px; background-color: #FEFDFD; text-align: center; border-bottom: 2px solid #FDF6EA;">
              <div style="display: inline-block; background-color: #A41534; color: #FEFDFD; padding: 6px 16px; border-radius: 8px; border: 2px solid #040404; box-shadow: 2px 2px 0px #040404; font-weight: 900; font-size: 22px; letter-spacing: 0.1em; text-transform: uppercase;">
                FRND
              </div>
              <p style="margin: 10px 0 0; font-family: Georgia, 'Times New Roman', serif; font-style: italic; color: #A41534; font-size: 15px; font-weight: 600;">
                Campus friends, made intentional.
              </p>
            </div>

            <!-- Body Section -->
            <div style="padding: 36px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 26px; font-weight: 900; color: #040404; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.2;">
                CAMPUS FRIENDS,<br>MADE <span style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; color: #A41534; text-transform: lowercase; font-weight: normal;">intentional.</span>
              </h1>

              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.65; color: #3A2F2D; font-weight: 500;">
                The verified campus dating app to meet your crush, match with real students, and spark authentic connections.
              </p>

              <!-- Status Badge Pill -->
              <div style="margin: 28px 0; background-color: #FDF4E5; border: 2px solid #A41534; border-radius: 9999px; padding: 16px 24px; text-align: center; box-shadow: 3px 3px 0px #040404;">
                <span style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #A41534;">
                  Spot Reserved on Waitlist
                </span>
              </div>

              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #3A2F2D; font-weight: 500;">
                Thanks for joining the FRND waitlist. We have successfully saved your spot. As soon as FRND launches for your campus, you will be among the first to receive early access.
              </p>

              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.65; color: #3A2F2D; font-weight: 500;">
                If you have any questions or feedback in the meantime, feel free to reply directly to this email.
              </p>

              <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #040404; font-weight: 700;">
                Best,<br>
                The FRND Team
              </p>
            </div>

            <!-- Dark Charcoal Footer -->
            <div style="padding: 24px 32px; background-color: #040404; color: #FEFDFD; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #E3D9CF;">
                You're receiving this because you signed up for the FRND waitlist.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #8B7B74; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
                © ${new Date().getFullYear()} FRND. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      `;

      const text = `Welcome to FRND\n\nHi there,\n\nThanks for joining the waitlist for FRND. We've reserved your spot on our list.\n\nWe are building an intentional space for campus students to connect, and we will let you know as soon as access opens for your campus.\n\nIf you have any questions or feedback in the meantime, feel free to reply directly to this email.\n\nBest,\nThe FRND Team`;

      await emailService.sendEmail({ to: cleanEmail, subject, text, html });
    }

    res.status(201).json({ message: 'Successfully joined the waitlist!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error joining waitlist' });
  }
});

module.exports = router;
