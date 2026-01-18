const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);
router.post('/scrape', productController.triggerScrape);
router.get('/', productController.getAllProducts);

module.exports = router;