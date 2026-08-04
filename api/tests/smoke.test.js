const assert = require('assert');
const path = require('path');

/**
 * Architecture Smoke Check Test Suite
 * Verifies module syntax, route loading, and utility exports.
 */
function runSmokeTest() {
  console.log('--- Running Architecture Smoke Test ---');

  const apiDir = path.resolve(__dirname, '..');
  const rootDir = path.resolve(apiDir, '..');

  // 1. Verify API Redis Utils
  const apiRedis = require(path.join(apiDir, 'utils/redis'));
  assert.ok(typeof apiRedis.get === 'function', 'api/utils/redis.get must be a function');
  assert.ok(typeof apiRedis.set === 'function', 'api/utils/redis.set must be a function');
  assert.ok(typeof apiRedis.mget === 'function', 'api/utils/redis.mget must be a function');
  assert.ok(typeof apiRedis.del === 'function', 'api/utils/redis.del must be a function');

  // 2. Verify Chat Redis Utils (if chat directory exists)
  try {
    const chatRedis = require(path.join(rootDir, 'chat/utils/redis'));
    assert.ok(typeof chatRedis.get === 'function', 'chat/utils/redis.get must be a function');
    assert.ok(typeof chatRedis.set === 'function', 'chat/utils/redis.set must be a function');
    console.log('✓ Chat Redis utilities verified.');
  } catch (err) {
    console.log('ℹ Skipping Chat Redis check in API test context.');
  }

  // 3. Verify Uploader Utils
  const uploader = require(path.join(apiDir, 'utils/uploader'));
  assert.ok(typeof uploader.uploadProfilePicture === 'function', 'uploader.uploadProfilePicture must be a function');
  assert.ok(typeof uploader.uploadVerificationImage === 'function', 'uploader.uploadVerificationImage must be a function');
  assert.ok(typeof uploader.getSignedPreviewUrl === 'function', 'uploader.getSignedPreviewUrl must be a function');

  // Verify getSignedPreviewUrl returns null cleanly on invalid publicId
  assert.strictEqual(uploader.getSignedPreviewUrl(null), null, 'getSignedPreviewUrl(null) must return null');
  assert.strictEqual(uploader.getSignedPreviewUrl(undefined), null, 'getSignedPreviewUrl(undefined) must return null');

  console.log('✓ Uploader utilities structure and null-safety verified.');

  // 4. Verify Express Routers export correctly
  const adminRouter = require(path.join(apiDir, 'routes/admin'));
  const socialRouter = require(path.join(apiDir, 'routes/social'));
  const verificationRouter = require(path.join(apiDir, 'routes/verification'));

  assert.ok(typeof adminRouter === 'function', 'api/routes/admin must export an Express router');
  assert.ok(typeof socialRouter === 'function', 'api/routes/social must export an Express router');
  assert.ok(typeof verificationRouter === 'function', 'api/routes/verification must export an Express router');

  console.log('✓ Express router exports verified.');

  console.log('--- Architecture Smoke Checks Passed! ---');
}

runSmokeTest();
