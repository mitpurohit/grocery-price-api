const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class BaseScraper {
  constructor(platformName) {
    this.platformName = platformName;
    this.baseDelay = 2000;
    this.maxRetries = 3;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async randomDelay() {
    const delay = this.baseDelay + Math.random() * 2000;
    await this.sleep(delay);
  }

  async fetchWithRetry(url, options = {}, retries = 0) {
    try {
      await this.randomDelay();
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...options.headers
        },
        timeout: 10000,
        ...options
      });
      
      return response;
    } catch (error) {
      if (retries < this.maxRetries) {
        logger.warn(`Retry ${retries + 1} for ${url}`);
        await this.sleep(this.baseDelay * (retries + 1));
        return this.fetchWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  }

  async scrapeWithPuppeteer(url, waitForSelector = null) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }
      
      await this.randomDelay();
      
      const content = await page.content();
      await browser.close();
      
      return cheerio.load(content);
    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  parsePrice(priceString) {
    if (!priceString) return null;
    const cleaned = priceString.replace(/[^\d.]/g, '');
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }

  normalizeProductName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  async searchProducts(query) {
    throw new Error('searchProducts must be implemented by child class');
  }

  async getProductDetails(productId) {
    throw new Error('getProductDetails must be implemented by child class');
  }

  formatProduct(data) {
    return {
      platform: this.platformName,
      id: data.id,
      name: data.name,
      price: this.parsePrice(data.price),
      originalPrice: data.originalPrice ? this.parsePrice(data.originalPrice) : null,
      discount: data.discount,
      image: data.image,
      url: data.url,
      inStock: data.inStock !== false,
      weight: data.weight,
      brand: data.brand,
      scrapedAt: new Date()
    };
  }

  log(message, level = 'info') {
    logger[level](`[${this.platformName}] ${message}`);
  }
}

module.exports = BaseScraper;