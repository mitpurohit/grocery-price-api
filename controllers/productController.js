const BlinkitScraper = require('../scrapers/blinkit-scraper');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

const scrapers = {
  blinkit: new BlinkitScraper()
};

const productController = {
  async searchProducts(req, res) {
    try {
      const { q: query, platforms } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      logger.info(`Searching for: ${query}`);

      const cacheKey = `search:${query}:${platforms || 'all'}`;
      const cachedResults = await cacheService.get(cacheKey);

      if (cachedResults) {
        logger.info('Returning cached results');
        return res.json(JSON.parse(cachedResults));
      }

      const platformList = platforms 
        ? platforms.split(',').filter(p => scrapers[p])
        : Object.keys(scrapers);

      const results = await Promise.allSettled(
        platformList.map(platform => 
          scrapers[platform].searchProducts(query)
        )
      );

      const products = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          products.push(...result.value);
        } else {
          logger.error(`${platformList[index]} search failed: ${result.reason}`);
        }
      });

      const groupedProducts = {};
      products.forEach(product => {
        const normalizedName = product.name.toLowerCase().trim();
        if (!groupedProducts[normalizedName]) {
          groupedProducts[normalizedName] = [];
        }
        groupedProducts[normalizedName].push(product);
      });

      const response = {
        query,
        totalResults: products.length,
        platforms: platformList,
        products: groupedProducts,
        timestamp: new Date().toISOString()
      };

      await cacheService.set(cacheKey, JSON.stringify(response), 3600);

      res.json(response);

    } catch (error) {
      logger.error(`Search error: ${error.message}`);
      res.status(500).json({ error: 'Failed to search products' });
    }
  },

  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      const cacheKey = `product:${id}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const platform = id.split('_')[0];
      
      if (!scrapers[platform]) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = await scrapers[platform].getProductDetails(id);
      
      if (product) {
        await cacheService.set(cacheKey, JSON.stringify(product), 3600);
        res.json(product);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }

    } catch (error) {
      logger.error(`Get product error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  },

  async triggerScrape(req, res) {
    try {
      const { platform, query } = req.body;

      if (!platform || !scrapers[platform]) {
        return res.status(400).json({ error: 'Valid platform required' });
      }

      if (!query) {
        return res.status(400).json({ error: 'Query required' });
      }

      logger.info(`Manual scrape triggered for ${platform}: ${query}`);
      
      const products = await scrapers[platform].searchProducts(query);
      
      res.json({
        success: true,
        platform,
        query,
        productsFound: products.length,
        products
      });

    } catch (error) {
      logger.error(`Scrape error: ${error.message}`);
      res.status(500).json({ error: 'Scraping failed' });
    }
  },

  async getAllProducts(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      res.json({
        products: [],
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: 0
      });

    } catch (error) {
      logger.error(`Get all products error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
};

module.exports = productController;