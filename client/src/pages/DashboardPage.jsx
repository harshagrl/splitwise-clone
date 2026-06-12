import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const DashboardPage = () => {
  const [totalBalance, setTotalBalance] = useState(0);
  const [groups, setGroups] = useState([]);
  const [balancesPerGroup, setBalancesPerGroup] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const balanceRes = await api.get('/users/me/balances');
      const { totalBalance, perGroup } = balanceRes.data.data;
      
      setTotalBalance(totalBalance);
      
      const balancesMap = {};
      perGroup.forEach(g => {
        balancesMap[g.groupId] = g.balance;
      });
      setBalancesPerGroup(balancesMap);

      const groupsRes = await api.get('/groups');
      setGroups(groupsRes.data.data.groups);
      
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsCreating(true);

    try {
      await api.post('/groups', { name: newGroupName });
      setNewGroupName('');
      setShowModal(false);
      fetchDashboardData(); 
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Determine balance state
  const isOwed = totalBalance > 0.01;
  const isOwing = totalBalance < -0.01;
  const isSettled = !isOwed && !isOwing;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Total Balance Summary Card */}
      <div className={`rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between border ${
        isOwed ? 'bg-primary-50 border-primary-100' : 
        isOwing ? 'bg-red-50 border-red-100' : 
        'bg-white border-gray-100'
      }`}>
        <div className="text-center sm:text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Overall Balance</h2>
          {isSettled ? (
            <div className="flex items-center gap-2 text-slate-800">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-3xl font-extrabold tracking-tight">You are all settled up!</span>
            </div>
          ) : (
            <div className={`text-4xl sm:text-5xl font-black tracking-tight ${isOwed ? 'text-primary-600' : 'text-danger'}`}>
              <span className="text-2xl mr-1 font-bold">₹</span>
              {Math.abs(totalBalance).toFixed(2)}
            </div>
          )}
          {!isSettled && (
            <p className={`mt-2 font-medium ${isOwed ? 'text-primary-700' : 'text-red-700'}`}>
              You {isOwed ? 'are owed' : 'owe'} {Math.abs(totalBalance).toFixed(2)} overall
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* Groups Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Your Groups</h3>
          {groups.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary-500 hover:bg-primary-600 shadow-sm transition-colors"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Group
            </button>
          )}
        </div>
        
        {groups.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-500 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No groups yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first group to start splitting expenses with your friends, family, or roommates.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-primary-500 hover:bg-primary-600 shadow-sm transition-colors"
            >
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {groups.map((group) => {
              const bal = balancesPerGroup[group.id] || 0;
              const gIsOwed = bal > 0.01;
              const gIsOwing = bal < -0.01;
              
              return (
                <Link 
                  key={group.id} 
                  to={`/groups/${group.id}`}
                  className="group block bg-white rounded-2xl shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md hover:border-primary-200 transition-all duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <h4 className="text-xl font-bold text-slate-800 truncate mb-1 group-hover:text-primary-600 transition-colors">
                      {group.name}
                    </h4>
                    <div className="flex items-center text-sm text-slate-500 font-medium mb-6">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {group.memberCount} members
                    </div>
                    
                    <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Balance</span>
                      <span className={`font-bold text-lg ${gIsOwed ? 'text-primary-600' : gIsOwing ? 'text-danger' : 'text-slate-400'}`}>
                        {gIsOwed ? '+' : ''}{bal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            {/* Backdrop blur */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setShowModal(false)}></div>
            
            <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-md">
              <form onSubmit={handleCreateGroup}>
                <div className="px-6 pt-6 pb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-6" id="modal-title">
                    Create New Group
                  </h3>
                  
                  {modalError && (
                    <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                      {modalError}
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="groupName" className="block text-sm font-semibold text-slate-700 mb-2">Group Name</label>
                    <input
                      type="text"
                      name="groupName"
                      id="groupName"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                      placeholder="e.g. Trip to Goa"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={isCreating || !newGroupName.trim()}
                    className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 sm:flex-none inline-flex justify-center items-center px-6 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
