import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const SettleUpModal = ({ groupId, onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track which debt row is actively being settled
  const [activeSettlementTo, setActiveSettlementTo] = useState(null); // stores the 'to' user id
  const [settleAmount, setSettleAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await api.get(`/groups/${groupId}/balances`);
        const allDebts = res.data.data.simplifiedDebts;
        
        // Filter: only show debts where logged-in user is the one who owes
        const userDebts = allDebts.filter(debt => debt.from === user.id);
        setDebts(userDebts);
      } catch (err) {
        setError('Failed to fetch balances for settlement.');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [groupId, user.id]);

  const handleSettleClick = (debt) => {
    setActiveSettlementTo(debt.to);
    setSettleAmount(debt.amount.toString());
  };

  const handleConfirmSettlement = async (e, debt) => {
    e.preventDefault();
    setError('');
    
    const amountNum = parseFloat(settleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (amountNum > debt.amount) {
      setError(`You cannot settle more than you owe (₹${debt.amount})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/settlements`, {
        paid_to_id: debt.to,
        amount: amountNum
      });
      
      // Clear active UI state
      setActiveSettlementTo(null);
      
      // Refresh local debts list manually by fetching balances again
      const res = await api.get(`/groups/${groupId}/balances`);
      const allDebts = res.data.data.simplifiedDebts;
      setDebts(allDebts.filter(d => d.from === user.id));

      // Tell parent to refresh
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900" id="modal-title">
              Settle Up
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded border border-red-100 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading balances...</div>
            ) : debts.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-medium text-emerald-600 mb-1">You are all settled up in this group!</p>
                <p className="text-sm text-gray-500">You do not owe anyone money.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {debts.map(debt => (
                  <div key={debt.to} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">You owe</p>
                        <p className="font-bold text-gray-900">{debt.toName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600 mb-2">₹{debt.amount.toFixed(2)}</p>
                        {activeSettlementTo !== debt.to && (
                          <button
                            onClick={() => handleSettleClick(debt)}
                            className="px-3 py-1 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Settlement Form */}
                    {activeSettlementTo === debt.to && (
                      <form onSubmit={(e) => handleConfirmSettlement(e, debt)} className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex gap-2 items-center">
                          <span className="text-gray-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={debt.amount}
                            required
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                          />
                        </div>
                        <div className="mt-3 flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveSettlementTo(null)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded bg-white hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded font-medium disabled:opacity-70"
                          >
                            {isSubmitting ? '...' : 'Confirm'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettleUpModal;
