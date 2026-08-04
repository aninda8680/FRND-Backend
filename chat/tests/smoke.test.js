const assert = require('assert');
const path = require('path');
const fs = require('fs');

/**
 * Architecture Smoke Check Test Suite for Chat Service
 * Verifies Chat database connector, Redis utilities, and Socket models.
 */
function runSmokeTest() {
  console.log('--- Running Chat Service Architecture Smoke Test ---');

  const chatDir = path.resolve(__dirname, '..');

  // 1. Verify Chat Redis Utils
  const chatRedis = require(path.join(chatDir, 'utils/redis'));
  assert.ok(typeof chatRedis.get === 'function', 'chat/utils/redis.get must be a function');
  assert.ok(typeof chatRedis.set === 'function', 'chat/utils/redis.set must be a function');
  assert.ok(typeof chatRedis.mget === 'function', 'chat/utils/redis.mget must be a function');
  assert.ok(typeof chatRedis.del === 'function', 'chat/utils/redis.del must be a function');
  assert.ok(typeof chatRedis.publish === 'function', 'chat/utils/redis.publish must be a function');

  console.log('✓ Chat Redis utilities verified.');

  // 2. Verify Chat DB helper
  const connectDB = require(path.join(chatDir, 'utils/db'));
  assert.ok(typeof connectDB === 'function', 'chat/utils/db must export connection function');

  console.log('✓ Chat Database connector verified.');

  // 3. Verify Chat Mongoose Models
  const modelsDir = path.join(chatDir, 'models');
  const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
  assert.ok(modelFiles.length >= 4, 'Expected Chat Mongoose model files must exist');

  for (const file of modelFiles) {
    const model = require(path.join(modelsDir, file));
    assert.ok(model && (typeof model === 'function' || typeof model === 'object'), `chat/models/${file} must export a Mongoose model`);
  }

  console.log(`✓ All ${modelFiles.length} Chat Mongoose models compiled cleanly (${modelFiles.join(', ')}).`);

  console.log('--- Chat Architecture Smoke Checks Passed! ---');
}

runSmokeTest();
