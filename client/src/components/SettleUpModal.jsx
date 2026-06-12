import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const SettleUpModal = ({ groupId, onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeSettlementTo, setActiveSettlementTo] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await api.get(`/groups/${groupId}/balances`);
        const allDebts = res.data.data.simplifiedDebts;
        
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
      
      setActiveSettlementTo(null);
      
      const res = await api.get(`/groups/${groupId}/balances`);
      const allDebts = res.data.data.simplifiedDebts;
      setDebts(allDebts.filter(d => d.from === user.id));

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-slate-800" id="modal-title">
              Settle Up
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-danger transition-colors bg-white hover:bg-red-50 rounded-full p-1.5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-6">
            {error && (
              <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-sm font-medium">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : debts.length === 0 ? (
              <div className="py-10 text-center bg-primary-50 rounded-2xl border border-primary-100">
                <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary-500 mb-3 shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-primary-700 text-lg mb-1">You are all settled up!</p>
                <p className="text-sm font-medium text-primary-600/80">You do not owe anyone money in this group.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {debts.map(debt => (
                  <div key={debt.to} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:border-gray-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">You owe</p>
                        <p className="text-lg font-bold text-slate-800">{debt.toName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-danger mb-2">₹{debt.amount.toFixed(2)}</p>
                        {activeSettlementTo !== debt.to && (
                          <button
                            onClick={() => handleSettleClick(debt)}
                            className="px-4 py-1.5 bg-primary-500 text-white text-sm font-bold rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Settlement Form */}
                    {activeSettlementTo === debt.to && (
                      <form onSubmit={(e) => handleConfirmSettlement(e, debt)} className="mt-5 pt-5 border-t border-gray-100">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Amount</label>
                        <div className="flex gap-3 items-center">
                          <span className="text-xl font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={debt.amount}
                            required
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-lg font-bold text-slate-800 outline-none transition-shadow"
                            autoFocus
                          />
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveSettlementTo(null)}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm text-white bg-primary-500 hover:bg-primary-600 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? 'Processing...' : 'Confirm'}
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
