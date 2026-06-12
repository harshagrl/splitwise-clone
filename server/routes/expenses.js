const express = require('express');
const router = express.Router({ mergeParams: true });
const expensesController = require('../controllers/expensesController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// These routes handle /api/expenses/:id
router.get('/:id', expensesController.getExpenseDetail);
router.delete('/:id', expensesController.deleteExpense);

// Chat Messages
const chatController = require('../controllers/chatController');
router.get('/:id/messages', chatController.getMessages);
router.post('/:id/messages', chatController.createMessage);

module.exports = router;
