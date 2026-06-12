import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import supabase from '../api/supabase';
import { AuthContext } from '../context/AuthContext';

const ExpenseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comments state
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

    // Subscribe to realtime updates for this expense's chat messages
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
          // If the message was sent by us, it might already be in the UI, 
          // but we can just append it anyway (avoiding duplicates by checking IDs)
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            
            // The payload.new doesn't include the joined 'user' relation automatically.
            // We need to fetch the user details or provide a placeholder.
            // A better way is to rely on our GET endpoint if needed, but since we want it instant:
            // Let's assume we can push it with a placeholder name, or fetch just that message.
            // Actually, we can fetch the user info from API or use a generic name if we can't get it.
            // But wait, the backend `getMessages` endpoint already provides it. Let's just refetch messages.
            fetchExpenseData();
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when messages update
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
      
      // Optimistically append (Realtime subscription will handle deduping)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
        <div className="text-red-500 mb-4">{error}</div>
        <Link to="/dashboard" className="text-emerald-600 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isPayer = expense.paid_by.id === user.id;
  const dateStr = new Date(expense.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={`/groups/${expense.group_id}`} className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to Group</span>
          </Link>
          {isPayer && (
            <button 
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Delete Expense
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Expense Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">{expense.description}</h1>
              <p className="mt-2 text-lg text-gray-600">
                Paid by <span className="font-bold text-gray-900">{isPayer ? 'You' : expense.paid_by.name}</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">{dateStr}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-4xl font-black text-gray-900">₹{Number(expense.amount).toFixed(2)}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full tracking-wide">
                {expense.split_type} SPLIT
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Split Breakdown</h3>
            <div className="space-y-3">
              {expense.splits.map(split => {
                const isMe = split.user.id === user.id;
                return (
                  <div 
                    key={split.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${isMe ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {isMe ? 'Y' : split.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-medium ${isMe ? 'text-emerald-900' : 'text-gray-900'}`}>
                        {isMe ? 'You' : split.user.name}
                      </span>
                    </div>
                    <span className={`font-bold ${isMe ? 'text-emerald-700' : 'text-gray-900'}`}>
                      ₹{Number(split.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comments
            </h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 mt-4 text-sm">No comments yet. Be the first to comment!</p>
            ) : (
              messages.map(msg => {
                const isMe = msg.user.id === user.id;
                const time = new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-500 mb-1 ml-1 mr-1">
                      {isMe ? 'You' : msg.user.name} • {time}
                    </span>
                    <div 
                      className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                        isMe 
                          ? 'bg-emerald-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-white rounded-b-xl">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                required
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-emerald-500 focus:border-emerald-500 text-sm shadow-sm"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ExpenseDetailPage;
