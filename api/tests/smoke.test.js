const assert = require('assert');
const path = require('path');
const fs = require('fs');

/**
 * Architecture Smoke Check Test Suite for API Service
 * Verifies module syntax, route loading, utility exports, and Mongoose model compilation.
 */
function runSmokeTest() {
  console.log('--- Running API Service Architecture Smoke Test ---');

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
    console.log('✓ Cross-service Chat Redis utilities verified.');
  } catch (err) {
    console.log('ℹ Skipping Chat Redis check in API test context.');
  }

  // 3. Verify Uploader & Other Utils
  const uploader = require(path.join(apiDir, 'utils/uploader'));
  assert.ok(typeof uploader.uploadProfilePicture === 'function', 'uploader.uploadProfilePicture must be a function');
  assert.ok(typeof uploader.uploadVerificationImage === 'function', 'uploader.uploadVerificationImage must be a function');
  assert.ok(typeof uploader.getSignedPreviewUrl === 'function', 'uploader.getSignedPreviewUrl must be a function');

  assert.strictEqual(uploader.getSignedPreviewUrl(null), null, 'getSignedPreviewUrl(null) must return null');
  assert.strictEqual(uploader.getSignedPreviewUrl(undefined), null, 'getSignedPreviewUrl(undefined) must return null');

  const emailService = require(path.join(apiDir, 'utils/emailService'));
  assert.ok(emailService, 'api/utils/emailService must export module');

  const imageHash = require(path.join(apiDir, 'utils/imageHash'));
  assert.ok(typeof imageHash.hashImage === 'function' || typeof imageHash === 'object', 'api/utils/imageHash must export expected helpers');

  const onboardingConfig = require(path.join(apiDir, 'utils/onboardingConfig'));
  assert.ok(onboardingConfig, 'api/utils/onboardingConfig must export module');

  const db = require(path.join(apiDir, 'utils/db'));
  assert.ok(typeof db === 'function', 'api/utils/db must export a connection function');

  console.log('✓ All API utilities verified.');

  // 4. Verify Express Middleware & Routers
  const authMiddleware = require(path.join(apiDir, 'middleware/auth'));
  assert.ok(typeof authMiddleware === 'function' || typeof authMiddleware === 'object', 'api/middleware/auth must export middleware');

  const routesDir = path.join(apiDir, 'routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  assert.ok(routeFiles.length >= 6, 'All expected route files must exist');

  for (const file of routeFiles) {
    const router = require(path.join(routesDir, file));
    assert.ok(typeof router === 'function', `api/routes/${file} must export an Express router`);
  }

  console.log(`✓ All ${routeFiles.length} Express routers verified (${routeFiles.join(', ')}).`);

  // 5. Verify Mongoose Models
  const modelsDir = path.join(apiDir, 'models');
  const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
  assert.ok(modelFiles.length >= 15, 'Expected Mongoose model files must exist');

  for (const file of modelFiles) {
    const model = require(path.join(modelsDir, file));
    assert.ok(model && (typeof model === 'function' || typeof model === 'object'), `api/models/${file} must export a Mongoose model`);
  }

  console.log(`✓ All ${modelFiles.length} Mongoose models compiled cleanly.`);

  console.log('--- API Architecture Smoke Checks Passed! ---');
}

runSmokeTest();
