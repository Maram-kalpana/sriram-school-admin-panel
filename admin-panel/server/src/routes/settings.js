const express = require('express');
const settingsController = require('../controllers/settingsController');
const role = require('../middleware/role');

const router = express.Router();

router.use(role('super_admin'));
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.get('/admins', settingsController.listAdmins);
router.post('/admins', settingsController.createAdmin);
router.patch('/admins/:id', settingsController.updateAdmin);

module.exports = router;
