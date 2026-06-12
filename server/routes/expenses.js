const express = require('express');
const router = express.Router({ mergeParams: true });
const expensesController = require('../controllers/expensesController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// These routes are mounted on /api/expenses/:id
router.get('/', expensesController.getExpenseDetail);
router.delete('/', expensesController.deleteExpense);

// Chat Messages (imported from chatController - to be implemented)
const chatController = require('../controllers/chatController');
router.get('/messages', chatController.getMessages);
router.post('/messages', chatController.createMessage);

module.exports = router;
