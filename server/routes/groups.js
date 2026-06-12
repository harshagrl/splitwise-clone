const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');
const authMiddleware = require('../middleware/authMiddleware');

// All group routes require authentication
router.use(authMiddleware);

router.get('/', groupsController.getGroups);
router.post('/', groupsController.createGroup);
router.get('/:id', groupsController.getGroupDetail);
router.post('/:id/members', groupsController.addMember);
router.delete('/:id/members/:userId', groupsController.removeMember);

// Group Expenses & Balances (imported from expensesController)
const expensesController = require('../controllers/expensesController');
router.get('/:id/expenses', expensesController.getGroupExpenses);
router.post('/:id/expenses', expensesController.createExpense);
router.get('/:id/balances', expensesController.getGroupBalances);

// Group Settlements (imported from settlementsController - to be implemented)
const settlementsController = require('../controllers/settlementsController');
router.get('/:id/settlements', settlementsController.getGroupSettlements);
router.post('/:id/settlements', settlementsController.createSettlement);

module.exports = router;
