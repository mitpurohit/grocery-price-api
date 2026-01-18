const BaseScraper = require('./base-scraper');

class BlinkitScraper extends BaseScraper {
  constructor() {
    super('Blinkit');
    this.baseUrl = 'https://blinkit.com';
  }

  async searchProducts(query) {
    try {
      this.log(`Searching for: ${query}`);
      
      const $ = await this.scrapeWithPuppeteer(
        `${this.baseUrl}/s/?q=${encodeURIComponent(query)}`,
        '.Product__UpdatedC'
      );
      
      const products = [];
      
      $('.Product__UpdatedC').each((index, element) => {
        try {
          const $el = $(element);
          
          const name = $el.find('.Product__UpdatedTitle').text().trim();
          const priceText = $el.find('.Product__UpdatedPrice').text().trim();
          const image = $el.find('img').attr('src');
          const productUrl = $el.find('a').attr('href');
          
          if (name && priceText) {
            products.push(this.formatProduct({
              id: this.generateId(name),
              name: name,
              price: priceText,
              image: image,
              url: productUrl ? `${this.baseUrl}${productUrl}` : null,
              inStock: true
            }));
          }
        } catch (error) {
          this.log(`Error parsing product: ${error.message}`, 'error');
        }
      });
      
      this.log(`Found ${products.length} products`);
      return products;
      
    } catch (error) {
      this.log(`Search failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async getProductDetails(productId) {
    try {
      this.log(`Fetching details for: ${productId}`);
      return null;
    } catch (error) {
      this.log(`Failed to get product details: ${error.message}`, 'error');
      throw error;
    }
  }

  generateId(name) {
    return `blinkit_${this.normalizeProductName(name).replace(/\s+/g, '_')}`;
  }
}

module.exports = BlinkitScraper;