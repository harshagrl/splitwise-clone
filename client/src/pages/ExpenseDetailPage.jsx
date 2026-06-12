import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import supabase from '../api/supabase';
import { AuthContext } from '../context/AuthContext';

const getAvatarColor = (name) => {
  const colors = ['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-indigo-100 text-indigo-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getBadgeColor = (type) => {
  switch(type) {
    case 'EQUAL': return 'bg-green-100 text-green-800 border-green-200';
    case 'EXACT': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PERCENTAGE': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'SHARES': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const ExpenseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchExpenseData = async () => {
    try {
      const expRes = await api.get(`/expenses/${id}`);
      setExpense(expRes.data.data.expense);

      const msgRes = await api.get(`/expenses/${id}/messages`);
      setMessages(msgRes.data.data.messages);
    } catch (err) {
      setError('Failed to load expense details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseData();

    const channel = supabase
      .channel(`chat_messages:expense_id=eq.${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `expense_id=eq.${id}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            fetchExpenseData();
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this expense? This cannot be undone.")) return;
    
    try {
      const groupId = expense.group_id;
      await api.delete(`/expenses/${id}`);
      navigate(`/groups/${groupId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await api.post(`/expenses/${id}/messages`, { content: newMessage });
      const newMsgData = res.data.data.message;
      
      setMessages(prev => {
        if (prev.find(m => m.id === newMsgData.id)) return prev;
        return [...prev, newMsgData];
      });
      
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block mb-4">{error}</div>
        <br />
        <Link to="/dashboard" className="text-primary-600 font-semibold hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isPayer = expense.paid_by.id === user.id;
  const dateStr = new Date(expense.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link to={`/groups/${expense.group_id}`} className="mt-1 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-500 hover:bg-gray-50 transition-colors shadow-sm shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{expense.description}</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{dateStr}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Summary & Splits (60%) */}
        <div className="w-full lg:w-[60%] space-y-6">
          
          {/* Summary Card */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${getAvatarColor(expense.paid_by.name)}`}>
                  {expense.paid_by.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Paid by</p>
                  <p className="text-xl font-bold text-slate-900">
                    {isPayer ? 'You' : expense.paid_by.name}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-5xl font-black text-slate-900 tracking-tight mb-2">
                  <span className="text-3xl text-slate-400 font-bold mr-1">₹</span>
                  {Number(expense.amount).toFixed(2)}
                </p>
                <div className="flex items-center sm:justify-end gap-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getBadgeColor(expense.split_type)}`}>
                    {expense.split_type}
                  </span>
                  {isPayer && (
                    <button 
                      onClick={handleDelete}
                      className="px-3 py-1 text-xs font-bold rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Split Breakdown */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-slate-800">Split Breakdown</h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {expense.splits.map(split => {
                const isMe = split.user.id === user.id;
                return (
                  <li 
                    key={split.id} 
                    className={`flex items-center justify-between p-5 transition-colors ${isMe ? 'bg-primary-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(split.user.name)}`}>
                        {split.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-bold ${isMe ? 'text-primary-800' : 'text-slate-800'}`}>
                        {isMe ? 'You' : split.user.name}
                      </span>
                    </div>
                    <span className={`font-bold text-lg ${isMe ? 'text-primary-600' : 'text-slate-900'}`}>
                      ₹{Number(split.amount).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Right Column: Chat (40%) */}
        <div className="w-full lg:w-[40%]">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px] lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comments
              </h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{messages.length}</span>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm font-medium">No comments yet.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.user.id === user.id;
                  const time = new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${
                          isMe 
                            ? 'bg-primary-500 text-white rounded-tr-sm' 
                            : 'bg-white border border-gray-100 text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 mt-1.5 mx-1">
                        {isMe ? 'You' : msg.user.name} • {time}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm shadow-sm outline-none transition-shadow bg-slate-50 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="w-11 h-11 flex-shrink-0 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
                >
                  <svg className="w-5 h-5 transform rotate-45 -mt-0.5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default ExpenseDetailPage;
