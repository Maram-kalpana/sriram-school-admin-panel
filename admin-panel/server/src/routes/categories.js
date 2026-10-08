const express = require('express');
const categoriesController = require('../controllers/categoriesController');
const role = require('../middleware/role');

const router = express.Router();

router.get('/', categoriesController.listCategories);
router.post('/', categoriesController.createCategory);
router.patch('/:id', categoriesController.updateCategory);
router.delete('/:id', role('super_admin'), categoriesController.deleteCategory);

module.exports = router;
