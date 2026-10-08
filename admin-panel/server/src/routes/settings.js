const express = require('express');
const settingsController = require('../controllers/settingsController');
const { diskUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/logo', diskUpload.single('logo'), settingsController.uploadLogo);
router.post('/test-email', settingsController.sendTestEmail);

module.exports = router;
