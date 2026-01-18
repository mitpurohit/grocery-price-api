const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.memoryCache = new Map();
  }

  async connect() {
    try {
      if (process.env.REDIS_URL) {
        this.client = redis.createClient({
          url: process.env.REDIS_URL
        });

        this.client.on('error', (err) => {
          logger.error(`Redis error: ${err}`);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          logger.info('Redis connected');
          this.isConnected = true;
        });

        await this.client.connect();
      } else {
        logger.warn('Redis URL not configured, using in-memory cache');
      }
    } catch (error) {
      logger.error(`Redis connection failed: ${error.message}`);
      logger.info('Falling back to in-memory cache');
    }
  }

  async get(key) {
    try {
      if (this.isConnected && this.client) {
        return await this.client.get(key);
      } else {
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.value;
        }
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttl, value);
      } else {
        this.memoryCache.set(key, {
          value,
          expiry: Date.now() + (ttl * 1000)
        });
        
        if (this.memoryCache.size > 1000) {
          this.cleanupMemoryCache();
        }
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error: ${error.message}`);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete error: ${error.message}`);
      return false;
    }
  }

  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error(`Redis disconnect error: ${error.message}`);
    }
  }
}

const cacheService = new CacheService();
cacheService.connect();

module.exports = cacheService;