import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const AddExpenseModal = ({ groupId, members, onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(user.id);
  const [splitType, setSplitType] = useState('EQUAL');
  
  const [participants, setParticipants] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initial = {};
    members.forEach(m => {
      initial[m.id] = { selected: true, value: '' };
    });
    setParticipants(initial);
  }, [members]);

  const handleCheckboxChange = (userId) => {
    setParticipants(prev => ({
      ...prev,
      [userId]: { ...prev[userId], selected: !prev[userId].selected }
    }));
  };

  const handleValueChange = (userId, val) => {
    setParticipants(prev => ({
      ...prev,
      [userId]: { ...prev[userId], value: val }
    }));
  };

  const validate = () => {
    const selectedUsers = Object.keys(participants).filter(uid => participants[uid].selected);
    if (selectedUsers.length < 2) return "At least 2 participants must be selected.";

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return "Please enter a valid amount greater than 0.";

    if (splitType === 'EQUAL') return null;

    let sum = 0;
    for (const uid of selectedUsers) {
      const val = parseFloat(participants[uid].value);
      if (isNaN(val) || val <= 0) return `Please enter a valid positive value for all selected participants.`;
      sum += val;
    }

    if (splitType === 'EXACT' && Math.abs(sum - numAmount) > 0.01) {
      return `Sum of exact amounts (${sum}) must equal the total expense amount (${numAmount}).`;
    }
    if (splitType === 'PERCENTAGE' && Math.abs(sum - 100) > 0.01) {
      return `Sum of percentages (${sum}%) must equal 100%.`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const selected_members = [];
      const split_values = {};

      Object.keys(participants).forEach(uid => {
        if (participants[uid].selected) {
          selected_members.push(uid);
          if (splitType !== 'EQUAL') {
            split_values[uid] = parseFloat(participants[uid].value);
          }
        }
      });

      const payload = {
        description,
        amount: parseFloat(amount),
        paid_by_id: paidById,
        split_type: splitType,
        selected_members,
        split_values: splitType !== 'EQUAL' ? split_values : undefined
      };

      await api.post(`/groups/${groupId}/expenses`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl w-full">
          
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-slate-800" id="modal-title">
              Add Expense
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-danger transition-colors bg-white hover:bg-red-50 rounded-full p-1.5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6">
              
              {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 border outline-none transition-shadow"
                    placeholder="e.g. Dinner at restaurant"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 border outline-none transition-shadow font-bold text-slate-800"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paid By</label>
                    <select
                      value={paidById}
                      onChange={e => setPaidById(e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 border outline-none transition-shadow font-medium text-slate-700"
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.id === user.id ? 'You' : m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Split Type</label>
                  <select
                    value={splitType}
                    onChange={e => setSplitType(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2.5 px-3 border outline-none transition-shadow font-medium text-slate-700"
                  >
                    <option value="EQUAL">Equally</option>
                    <option value="EXACT">Exact Amounts</option>
                    <option value="PERCENTAGE">By Percentages</option>
                    <option value="SHARES">By Shares</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Participants & Split</label>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent transition-colors">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`member-${m.id}`}
                            checked={participants[m.id]?.selected || false}
                            onChange={() => handleCheckboxChange(m.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                          />
                          <label htmlFor={`member-${m.id}`} className="ml-3 block text-sm font-medium text-slate-800 cursor-pointer select-none">
                            {m.id === user.id ? 'You' : m.name}
                          </label>
                        </div>
                        
                        {splitType !== 'EQUAL' && participants[m.id]?.selected && (
                          <div className="flex items-center">
                            <input
                              type="number"
                              step={splitType === 'SHARES' ? "1" : "0.01"}
                              required
                              value={participants[m.id]?.value}
                              onChange={(e) => handleValueChange(m.id, e.target.value)}
                              className="w-24 border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-1.5 px-2 border text-right font-semibold outline-none"
                              placeholder={splitType === 'PERCENTAGE' ? "%" : "0"}
                            />
                            {splitType === 'PERCENTAGE' && <span className="ml-2 text-slate-500 font-bold">%</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;
