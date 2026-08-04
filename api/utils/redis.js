const { Redis } = require('@upstash/redis');

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables missing in production mode.');
  }
}

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const redis = {
  get: async (key) => {
    return await redisClient.get(key);
  },
  mget: async (...keys) => {
    const flatKeys = keys.flat().filter(Boolean);
    if (flatKeys.length === 0) return [];
    const res = await redisClient.mget(...flatKeys);
    return Array.isArray(res) ? res : [res];
  },
  set: async (key, value, options) => {
    let opts = {};
    if (options) {
      if (options.EX) opts.ex = options.EX;
      if (options.ex) opts.ex = options.ex;
      if (options.PX) opts.px = options.PX;
      if (options.px) opts.px = options.px;
      if (options.NX || options.nx) opts.nx = true;
    }
    return await redisClient.set(key, String(value), opts);
  },
  del: async (...keys) => {
    const flatKeys = keys.flat().filter(Boolean);
    if (flatKeys.length === 0) return 0;
    return await redisClient.del(...flatKeys);
  },
  incr: async (key) => {
    return await redisClient.incr(key);
  },
  expire: async (key, seconds) => {
    return await redisClient.expire(key, seconds);
  },
  expireAt: async (key, timestamp) => {
    return await redisClient.expireAt(key, timestamp);
  },
  sAdd: async (key, value) => {
    return await redisClient.sadd(key, String(value));
  },
  sCard: async (key) => {
    return await redisClient.scard(key);
  },
  zAdd: async (key, score, value) => {
    return await redisClient.zadd(key, { score, member: String(value) });
  },
  zCount: async (key, min, max) => {
    return await redisClient.zcount(key, min, max);
  },
  zRemRangeByScore: async (key, min, max) => {
    return await redisClient.zremrangebyscore(key, min, max);
  },
  publish: async (channel, message) => {
    const payload = typeof message === 'object' ? JSON.stringify(message) : String(message);
    return await redisClient.publish(channel, payload);
  },
  quit: async () => {
    // @upstash/redis is an HTTP REST client (stateless), no persistent TCP connection to close
    return Promise.resolve();
  },
  clientStatus: () => ({ isMock: false, connected: true })
};

module.exports = redis;
