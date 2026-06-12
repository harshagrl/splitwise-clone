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
      // Fetch overall balances (gives total balance and balance per group)
      const balanceRes = await api.get('/users/me/balances');
      const { totalBalance, perGroup } = balanceRes.data.data;
      
      setTotalBalance(totalBalance);
      
      const balancesMap = {};
      perGroup.forEach(g => {
        balancesMap[g.groupId] = g.balance;
      });
      setBalancesPerGroup(balancesMap);

      // Fetch groups to get group details (member count, joined date, etc)
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
      fetchDashboardData(); // Refresh list
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center text-white font-bold text-xl">S</div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Total Balance Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center sm:text-left sm:flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Total Balance</h2>
            <div className="flex items-baseline justify-center sm:justify-start gap-2">
              <span className={`text-4xl font-extrabold ${totalBalance > 0 ? 'text-emerald-600' : totalBalance < 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {totalBalance > 0 ? '+' : ''}{totalBalance.toFixed(2)}
              </span>
              <span className="text-gray-500 font-medium">INR</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {totalBalance > 0 
                ? 'You are owed overall.' 
                : totalBalance < 0 
                  ? 'You owe money overall.' 
                  : 'You are all settled up!'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 sm:mt-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Group
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Groups Grid */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Groups</h3>
          
          {groups.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => {
                const bal = balancesPerGroup[group.id] || 0;
                return (
                  <Link 
                    key={group.id} 
                    to={`/groups/${group.id}`}
                    className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all group overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <h4 className="text-lg font-bold text-gray-900 truncate pr-2 group-hover:text-emerald-700 transition-colors">
                          {group.name}
                        </h4>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {group.memberCount} members
                        </span>
                        
                        <div className="text-right">
                          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Your Balance</span>
                          <span className={`font-bold ${bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {bal > 0 ? '+' : ''}{bal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleCreateGroup}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Create New Group
                      </h3>
                      <div className="mt-4">
                        {modalError && (
                          <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                            {modalError}
                          </div>
                        )}
                        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input
                          type="text"
                          name="groupName"
                          id="groupName"
                          required
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                          placeholder="Trip to Goa"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isCreating || !newGroupName.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
