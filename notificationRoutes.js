const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { lister, marquerLues } = require('../controllers/notificationController');

router.get('/', verifierToken, lister);
router.patch('/lues', verifierToken, marquerLues);

module.exports = router;
