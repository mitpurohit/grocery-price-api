const express = require('express');
const router = express.Router();
const compareController = require('../controllers/compareController');

router.get('/', compareController.compareProduct);
router.get('/category', compareController.compareCategory);
router.get('/deals', compareController.getBestDeals);

module.exports = router;