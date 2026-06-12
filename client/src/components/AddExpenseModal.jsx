import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const AddExpenseModal = ({ groupId, members, onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(user.id);
  const [splitType, setSplitType] = useState('EQUAL');
  
  // Track selected status and value for each member
  // { userId: { selected: boolean, value: number | string } }
  const [participants, setParticipants] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize participants state on mount
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
    
    if (selectedUsers.length < 2) {
      return "At least 2 participants must be selected.";
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return "Please enter a valid amount greater than 0.";
    }

    if (splitType === 'EQUAL') return null;

    let sum = 0;
    for (const uid of selectedUsers) {
      const val = parseFloat(participants[uid].value);
      if (isNaN(val) || val <= 0) {
        return `Please enter a valid positive value for all selected participants.`;
      }
      sum += val;
    }

    if (splitType === 'EXACT') {
      // Sum must equal total amount
      if (Math.abs(sum - numAmount) > 0.01) {
        return `Sum of exact amounts (${sum}) must equal the total expense amount (${numAmount}).`;
      }
    }

    if (splitType === 'PERCENTAGE') {
      // Sum must equal 100
      if (Math.abs(sum - 100) > 0.01) {
        return `Sum of percentages (${sum}%) must equal 100%.`;
      }
    }

    // SHARES requires no sum validation, just positive numbers

    return null; // valid
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
      // Map mental model to actual backend API payload
      const selected_members = [];
      const split_values = {};

      Object.keys(participants).forEach(uid => {
        if (participants[uid].selected) {
          selected_members.push(uid);
          // Only send split_values if not EQUAL
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
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl w-full">
          
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900" id="modal-title">
              Add Expense
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4">
            
            {error && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded border border-red-100 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 px-3 border"
                  placeholder="Dinner at restaurant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 px-3 border"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <select
                    value={paidById}
                    onChange={e => setPaidById(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 px-3 border"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.id === user.id ? 'You' : m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Split Type</label>
                <select
                  value={splitType}
                  onChange={e => setSplitType(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 px-3 border"
                >
                  <option value="EQUAL">Equally</option>
                  <option value="EXACT">Exact Amounts</option>
                  <option value="PERCENTAGE">By Percentages</option>
                  <option value="SHARES">By Shares</option>
                </select>
              </div>

              <div className="mt-6 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Participants & Split</label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`member-${m.id}`}
                          checked={participants[m.id]?.selected || false}
                          onChange={() => handleCheckboxChange(m.id)}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`member-${m.id}`} className="ml-2 block text-sm text-gray-900">
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
                            className="w-24 border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-1 px-2 border text-right"
                            placeholder={splitType === 'PERCENTAGE' ? "%" : "0"}
                          />
                          {splitType === 'PERCENTAGE' && <span className="ml-1 text-gray-500">%</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none shadow-sm sm:text-sm disabled:opacity-70"
              >
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none shadow-sm sm:text-sm"
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
