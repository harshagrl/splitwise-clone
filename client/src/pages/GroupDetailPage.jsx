import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';

const GroupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]); // Simplified debts
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Modals placeholder state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const [groupRes, expRes, balRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`)
      ]);

      setGroup(groupRes.data.data.group);
      setExpenses(expRes.data.data.expenses);
      setBalances(balRes.data.data.simplifiedDebts);
    } catch (err) {
      setError('Failed to load group details.');
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    
    setAddingMember(true);
    setMemberError('');
    try {
      await api.post(`/groups/${id}/members`, { email: newMemberEmail });
      setNewMemberEmail('');
      // Refresh just the group data to show new member
      const groupRes = await api.get(`/groups/${id}`);
      setGroup(groupRes.data.data.group);
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    
    try {
      await api.delete(`/groups/${id}/members/${memberId}`);
      // Refresh group data
      const groupRes = await api.get(`/groups/${id}`);
      setGroup(groupRes.data.data.group);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
        <div className="text-red-500 mb-4">{error}</div>
        <Link to="/dashboard" className="text-emerald-600 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isCreator = group.created_by.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
              <p className="text-xs text-gray-500">Created by {isCreator ? 'you' : group.created_by.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettleUp(true)}
              className="px-4 py-2 border border-emerald-600 text-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Settle Up
            </button>
            <button 
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
            >
              Add Expense
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Expenses & Balances */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Balances Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Group Balances</h2>
            {balances.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="font-medium">All settled up!</p>
                <p className="text-sm mt-1">No debts found in this group.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {balances.map((debt, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{debt.fromName}</span>
                      <span className="mx-2 text-gray-400 text-sm">owes</span>
                      <span className="font-medium text-gray-900">{debt.toName}</span>
                    </div>
                    <span className="font-bold text-orange-600">₹{debt.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Expenses Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Expenses</h2>
            {expenses.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No expenses yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => {
                  const date = new Date(expense.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <Link 
                      key={expense.id} 
                      to={`/expenses/${expense.id}`}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-center text-xs font-semibold text-gray-400 uppercase">
                          {date}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{expense.description}</p>
                          <p className="text-xs text-gray-500">paid by {expense.paid_by.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">₹{Number(expense.amount).toFixed(2)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Members */}
        <div className="space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Members ({group.members.length})</h2>
            
            <ul className="space-y-3 mb-6">
              {group.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.name} {member.id === user.id && '(you)'}
                      </p>
                    </div>
                  </div>
                  {/* Remove Button logic: only if current user is creator, and not removing themselves */}
                  {isCreator && member.id !== user.id && (
                    <button 
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors p-1"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddMember} className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add Member</h3>
              {memberError && <p className="text-xs text-red-600 mb-2">{memberError}</p>}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="friend@email.com"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={addingMember || !newMemberEmail}
                  className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70"
                >
                  {addingMember ? '...' : 'Add'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* Placeholders for modals (will be built in 7c and 7d) */}
      {showAddExpense && (
        <AddExpenseModal
          groupId={id}
          members={group.members}
          onClose={() => setShowAddExpense(false)}
          onSuccess={fetchGroupData}
        />
      )}

      {showSettleUp && (
        <SettleUpModal
          groupId={id}
          onClose={() => setShowSettleUp(false)}
          onSuccess={fetchGroupData}
        />
      )}
    </div>
  );
};

export default GroupDetailPage;
