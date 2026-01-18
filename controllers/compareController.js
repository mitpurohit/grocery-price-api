const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');
const BlinkitScraper = require('../scrapers/blinkit-scraper');

const scrapers = {
  blinkit: new BlinkitScraper()
};

const compareController = {
  async compareProduct(req, res) {
    try {
      const { product, platforms } = req.query;

      if (!product) {
        return res.status(400).json({ error: 'Product query parameter required' });
      }

      logger.info(`Comparing prices for: ${product}`);

      const cacheKey = `compare:${product}:${platforms || 'all'}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        logger.info('Returning cached comparison');
        return res.json(JSON.parse(cached));
      }

      const platformList = platforms 
        ? platforms.split(',').filter(p => scrapers[p])
        : Object.keys(scrapers);

      const results = await Promise.allSettled(
        platformList.map(platform => 
          scrapers[platform].searchProducts(product)
        )
      );

      const allProducts = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allProducts.push(...result.value.map(p => ({
            ...p,
            platform: platformList[index]
          })));
        }
      });

      const bestPrice = allProducts.length > 0 
        ? Math.min(...allProducts.filter(p => p.price).map(p => p.price))
        : null;

      const comparison = allProducts.map(p => ({
        ...p,
        savings: bestPrice && p.price ? p.price - bestPrice : 0,
        isBestPrice: p.price === bestPrice
      }));

      comparison.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

      const response = {
        query: product,
        bestPrice,
        comparison,
        platformsChecked: platformList,
        totalOptions: comparison.length,
        timestamp: new Date().toISOString()
      };

      await cacheService.set(cacheKey, JSON.stringify(response), 1800);

      res.json(response);

    } catch (error) {
      logger.error(`Compare error: ${error.message}`);
      res.status(500).json({ error: 'Price comparison failed' });
    }
  },

  async compareCategory(req, res) {
    try {
      const { category } = req.query;

      if (!category) {
        return res.status(400).json({ error: 'Category parameter required' });
      }

      logger.info(`Comparing category: ${category}`);

      res.json({
        category,
        message: 'Category comparison not yet implemented',
        suggestion: 'Use product search instead'
      });

    } catch (error) {
      logger.error(`Category compare error: ${error.message}`);
      res.status(500).json({ error: 'Category comparison failed' });
    }
  },

  async getBestDeals(req, res) {
    try {
      const { limit = 20 } = req.query;

      logger.info('Fetching best deals');

      res.json({
        deals: [],
        limit: parseInt(limit),
        message: 'Best deals feature coming soon'
      });

    } catch (error) {
      logger.error(`Best deals error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch deals' });
    }
  }
};

module.exports = compareController;