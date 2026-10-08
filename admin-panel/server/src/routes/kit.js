const express = require('express');
const kitController = require('../controllers/kitController');
const { diskUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/', kitController.getActiveKit);
router.put('/', kitController.saveKit);
router.post('/image', diskUpload.single('image'), kitController.uploadKitImage);

module.exports = router;
