import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';

// Helper to generate a background color from a string (for avatars)
const getAvatarColor = (name) => {
  const colors = ['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-indigo-100 text-indigo-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const GroupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

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
      const groupRes = await api.get(`/groups/${id}`);
      setGroup(groupRes.data.data.group);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block mb-4">{error}</div>
        <br />
        <Link to="/dashboard" className="text-primary-600 font-semibold hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isCreator = group.created_by.id === user.id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-500 hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{group.name}</h1>
            <p className="text-sm font-medium text-slate-500">{group.members.length} members</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSettleUp(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors text-sm"
          >
            Settle Up
          </button>
          <button 
            onClick={() => setShowAddExpense(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 shadow-sm transition-colors text-sm"
          >
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Expenses */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-slate-800">Expenses</h2>
            </div>
            
            {expenses.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-slate-400 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">No expenses yet. Add your first expense!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {expenses.map((expense) => {
                  const date = new Date(expense.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <Link 
                      key={expense.id} 
                      to={`/expenses/${expense.id}`}
                      className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 text-center">
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{date.split(' ')[0]}</span>
                          <span className="block text-lg font-bold text-slate-700">{date.split(' ')[1]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{expense.description}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Paid by {expense.paid_by.id === user.id ? 'you' : expense.paid_by.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-slate-900">₹{Number(expense.amount).toFixed(2)}</span>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Balances & Members */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Balances Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-slate-800">Balances</h2>
            </div>
            
            <div className="p-6">
              {balances.length === 0 ? (
                <div className="flex items-center gap-2 text-primary-600 font-bold justify-center py-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All settled up!
                </div>
              ) : (
                <ul className="space-y-4">
                  {balances.map((debt, idx) => {
                    const amIFrom = debt.from === user.id;
                    const amITo = debt.to === user.id;
                    return (
                      <li key={idx} className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <span className="font-bold text-slate-800">{amIFrom ? 'You' : debt.fromName}</span>
                            <span className="mx-1.5 text-slate-400">owes</span>
                            <span className="font-bold text-slate-800">{amITo ? 'You' : debt.toName}</span>
                          </div>
                          <span className={`font-bold ${amIFrom ? 'text-danger' : amITo ? 'text-primary-600' : 'text-slate-600'}`}>
                            ₹{debt.amount.toFixed(2)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Members Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-slate-800">Members</h2>
            </div>
            
            <ul className="divide-y divide-gray-50">
              {group.members.map((member) => (
                <li key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(member.name)}`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {member.name} {member.id === user.id && <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wide">You</span>}
                      </p>
                    </div>
                  </div>
                  {isCreator && member.id !== user.id && (
                    <button 
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-gray-400 hover:text-danger hover:bg-red-50 p-2 rounded-full transition-colors"
                      title="Remove member"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <form onSubmit={handleAddMember}>
                {memberError && <p className="text-xs text-danger font-medium mb-2">{memberError}</p>}
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Add member by email..."
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm transition-shadow"
                  />
                  <button
                    type="submit"
                    disabled={addingMember || !newMemberEmail}
                    className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {addingMember ? '...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </section>

        </div>
      </div>

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
