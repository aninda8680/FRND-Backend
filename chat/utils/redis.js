const { Redis } = require('@upstash/redis');

function resolveCredentials() {
  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

  const rawUrl = url || process.env.REDIS_URL;
  if (rawUrl) {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const parsed = new URL(rawUrl);
        url = `${parsed.protocol}//${parsed.host}`;
        if (!token && parsed.password) {
          token = decodeURIComponent(parsed.password);
        }
      } catch {
        // ignore parse errors
      }
    } else if (rawUrl.startsWith('redis://') || rawUrl.startsWith('rediss://')) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname && parsed.password) {
          url = `https://${parsed.hostname}`;
          token = decodeURIComponent(parsed.password);
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  const isConfigured = Boolean(url && token && url.startsWith('http'));
  return { url, token, isConfigured };
}

const { url, token, isConfigured } = resolveCredentials();

if (!isConfigured) {
  if (process.env.NODE_ENV === 'production') {
    console.error('WARNING: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN or REDIS_URL missing or invalid in production. Redis caching disabled gracefully.');
  }
}

const redisClient = isConfigured
  ? new Redis({
      url,
      token,
      automaticDeserialization: false,
    })
  : null;

const redis = {
  get: async (key) => {
    if (!redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.warn('[CHAT REDIS GET ERR]:', err.message);
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
      console.warn('[CHAT REDIS MGET ERR]:', err.message);
      return [];
    }
  },
  set: async (key, value, options) => {
    if (!redisClient) return 'OK';
    try {
      let opts = {};
      if (options) {
        if (options.EX || options.ex) opts.ex = options.EX || options.ex;
        if (options.PX || options.px) opts.px = options.PX || options.px;
        if (options.NX || options.nx) opts.nx = true;
      }
      const valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
      return await redisClient.set(key, valStr, opts);
    } catch (err) {
      console.warn('[CHAT REDIS SET ERR]:', err.message);
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
      console.warn('[CHAT REDIS DEL ERR]:', err.message);
      return 0;
    }
  },
  incr: async (key) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.incr(key);
    } catch (err) {
      console.warn('[CHAT REDIS INCR ERR]:', err.message);
      return 0;
    }
  },
  expire: async (key, seconds) => {
    if (!redisClient) return 1;
    try {
      return await redisClient.expire(key, seconds);
    } catch (err) {
      console.warn('[CHAT REDIS EXPIRE ERR]:', err.message);
      return 1;
    }
  },
  expireAt: async (key, timestamp) => {
    if (!redisClient) return 1;
    try {
      return await redisClient.expireAt(key, timestamp);
    } catch (err) {
      console.warn('[CHAT REDIS EXPIREAT ERR]:', err.message);
      return 1;
    }
  },
  sAdd: async (key, value) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.sadd(key, String(value));
    } catch (err) {
      console.warn('[CHAT REDIS SADD ERR]:', err.message);
      return 0;
    }
  },
  sCard: async (key) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.scard(key);
    } catch (err) {
      console.warn('[CHAT REDIS SCARD ERR]:', err.message);
      return 0;
    }
  },
  zAdd: async (key, score, value) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.zadd(key, { score, member: String(value) });
    } catch (err) {
      console.warn('[CHAT REDIS ZADD ERR]:', err.message);
      return 0;
    }
  },
  zCount: async (key, min, max) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.zcount(key, min, max);
    } catch (err) {
      console.warn('[CHAT REDIS ZCOUNT ERR]:', err.message);
      return 0;
    }
  },
  zRemRangeByScore: async (key, min, max) => {
    if (!redisClient) return 0;
    try {
      return await redisClient.zremrangebyscore(key, min, max);
    } catch (err) {
      console.warn('[CHAT REDIS ZREMRANGEBYSCORE ERR]:', err.message);
      return 0;
    }
  },
  publish: async (channel, message) => {
    if (!redisClient) return 0;
    try {
      const payload = typeof message === 'object' ? JSON.stringify(message) : String(message);
      return await redisClient.publish(channel, payload);
    } catch (err) {
      console.warn('[CHAT REDIS PUBLISH ERR]:', err.message);
      return 0;
    }
  },
  quit: async () => {
    return Promise.resolve();
  },
  clientStatus: () => ({
    isMock: !isConfigured,
    connected: isConfigured,
    url: url || null
  })
};

// Method aliases for standardization and compatibility
redis.sadd = redis.sAdd;
redis.scard = redis.sCard;
redis.zadd = redis.zAdd;
redis.zcount = redis.zCount;
redis.zremrangebyscore = redis.zRemRangeByScore;

module.exports = redis;
