const express = require('express');
const categoriesController = require('../controllers/categoriesController');
const router = express.Router();

router.get('/', categoriesController.listCategories);
router.post('/', categoriesController.createCategory);
router.patch('/:id', categoriesController.updateCategory);
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;
