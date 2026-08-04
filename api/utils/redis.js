const { Redis } = require('@upstash/redis');

const isConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_URL.startsWith('http')
);

if (!isConfigured) {
  if (process.env.NODE_ENV === 'production') {
    console.error('WARNING: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing or invalid in production. Redis caching and rate-limiting disabled gracefully.');
  }
}

const redisClient = isConfigured ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null;

const redis = {
  get: async (key) => {
    if (!redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.warn('[REDIS GET ERR]:', err.message);
      return null;
    }
  },
  mget: async (...keys) => {
    if (!redisClient) return [];
    try {
      const flatKeys = keys.flat().filter(Boolean);
      if (flatKeys.length === 0) return [];
      const res = await redisClient.mget(...flatKeys);
      return Array.isArray(res) ? res : [res];
    } catch (err) {
      console.warn('[REDIS MGET ERR]:', err.message);
      return [];
    }
  },
  set: async (key, value, options) => {
    if (!redisClient) return 'OK';
    try {
      let opts = {};
      if (options) {
        if (options.EX) opts.ex = options.EX;
        if (options.ex) opts.ex = options.ex;
        if (options.PX) opts.px = options.PX;
        if (options.px) opts.px = options.px;
        if (options.NX || options.nx) opts.nx = true;
      }
      return await redisClient.set(key, String(value), opts);
    } catch (err) {
      console.warn('[REDIS SET ERR]:', err.message);
      return 'OK';
    }
  },
  del: async (...keys) => {
    if (!redisClient) return 0;
    try {
      const flatKeys = keys.flat().filter(Boolean);
      if (flatKeys.length === 0) return 0;
      return await redisClient.del(...flatKeys);
    } catch (err) {
      console.warn('[REDIS DEL ERR]:', err.message);
      return 0;
    }
  },
  incr: async (key) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.incr(key);
    } catch (err) {
      console.warn('[REDIS INCR ERR]:', err.message);
      return 0;
    }
  },
  expire: async (key, seconds) => {
    if (!redisClient) return 1;
    try {
      return await redisClient.expire(key, seconds);
    } catch (err) {
      console.warn('[REDIS EXPIRE ERR]:', err.message);
      return 1;
    }
  },
  expireAt: async (key, timestamp) => {
    if (!redisClient) return 1;
    try {
      return await redisClient.expireAt(key, timestamp);
    } catch (err) {
      console.warn('[REDIS EXPIREAT ERR]:', err.message);
      return 1;
    }
  },
  sAdd: async (key, value) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.sadd(key, String(value));
    } catch (err) {
      console.warn('[REDIS SADD ERR]:', err.message);
      return 0;
    }
  },
  sCard: async (key) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.scard(key);
    } catch (err) {
      console.warn('[REDIS SCARD ERR]:', err.message);
      return 0;
    }
  },
  zAdd: async (key, score, value) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.zadd(key, { score, member: String(value) });
    } catch (err) {
      console.warn('[REDIS ZADD ERR]:', err.message);
      return 0;
    }
  },
  zCount: async (key, min, max) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.zcount(key, min, max);
    } catch (err) {
      console.warn('[REDIS ZCOUNT ERR]:', err.message);
      return 0;
    }
  },
  zRemRangeByScore: async (key, min, max) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.zremrangebyscore(key, min, max);
    } catch (err) {
      console.warn('[REDIS ZREMRANGEBYSCORE ERR]:', err.message);
      return 0;
    }
  },
  publish: async (channel, message) => {
    if (!redisClient) return 0;
    try {
      const payload = typeof message === 'object' ? JSON.stringify(message) : String(message);
      return await redisClient.publish(channel, payload);
    } catch (err) {
      console.warn('[REDIS PUBLISH ERR]:', err.message);
      return 0;
    }
  },
  quit: async () => {
    return Promise.resolve();
  },
  clientStatus: () => ({ isMock: !isConfigured, connected: isConfigured })
};

module.exports = redis;
