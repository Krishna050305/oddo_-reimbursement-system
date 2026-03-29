import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { LogOut, CheckCircle, XCircle, Clock, WalletCards, RefreshCcw, User, AlertCircle } from 'lucide-react';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const companyCurrency = user?.company?.currency || 'INR';
  const [pending, setPending] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);

  // For comments
  const [comments, setComments] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, decisionsRes] = await Promise.all([
        api.get('/expenses/pending-approvals'),
        api.get('/expenses/decisions')
      ]);
      setPending(pendingRes.data);
      setDecisions(decisionsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCommentChange = (stepId, value) => {
    setComments({ ...comments, [stepId]: value });
  };

  const handleDecide = async (stepId, decision) => {
    setActionError(null);
    try {
      await api.patch(`/expenses/decide/${stepId}`, {
        decision,
        comment: comments[stepId] || ''
      });
      fetchData();
    } catch (err) {
      console.error('Failed to decide', err);
      setActionError(err.response?.data?.error || 'Failed to record decision. Please try again.');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Error Toast */}
      {actionError && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 bg-red-600 text-white animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={16} /> {actionError}
        </div>
      )}

      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="text-brand-600 bg-brand-50 p-2 rounded-xl">
                <WalletCards size={24} />
              </div>
              <div>
                <span className="font-bold text-xl text-slate-800 tracking-tight">Oddo</span>
                <span className="ml-2 text-sm text-slate-500 font-medium hidden sm:inline-block">/ Manager Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <User size={16} />
                <span className="hidden sm:inline">{user?.name}</span>
                <span className="px-3 py-1 bg-brand-100 text-brand-800 rounded-full ml-1 text-xs font-bold uppercase">{user?.role}</span>
              </div>
              <button onClick={logout} className="secondary-btn text-sm py-1.5 px-3">
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 border-b border-slate-200 pb-4 gap-3">
           <div>
              <h1 className="text-2xl font-bold text-slate-900">Approvals Overview</h1>
              <p className="text-slate-500 mt-1">Manage team expense requests efficiently.</p>
           </div>
           <button onClick={fetchData} className="secondary-btn">
             <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh
           </button>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="text-yellow-500" size={20} /> Pending Action
            {pending.length > 0 && <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-bold">{pending.length}</span>}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && pending.length === 0 ? (
               <div className="col-span-full py-12 text-center text-slate-400">
                 <RefreshCcw className="animate-spin mx-auto mb-2" size={24} />
                 Loading requests...
               </div>
            ) : pending.length === 0 ? (
               <div className="col-span-full py-12 text-center">
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4 text-green-500">
                   <CheckCircle size={32} />
                 </div>
                 <p className="text-slate-600 font-semibold text-lg">No pending approvals — you're all caught up! ✓</p>
                 <p className="text-sm text-slate-400 mt-1">New expense requests will appear here when submitted by team members.</p>
               </div>
            ) : (
              pending.map(step => (
                <div key={step.id} className="glass-panel rounded-2xl p-5 hover:shadow-2xl transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{step.expense.category}</span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{step.expense.employee.name}</h3>
                      </div>
                      <div className="text-right">
                         {step.expense.convertedAmount && step.expense.currency !== companyCurrency ? (
                           <>
                             <span className="text-xl font-black text-brand-600 block">
                               {step.expense.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {companyCurrency}
                             </span>
                             <span className="text-xs text-slate-400">(from {step.expense.amount.toLocaleString()} {step.expense.currency})</span>
                           </>
                         ) : (
                           <span className="text-xl font-black text-brand-600 block">
                            {step.expense.amount.toLocaleString()} {step.expense.currency}
                           </span>
                         )}
                         <span className="text-xs text-slate-400 block">{new Date(step.expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 mb-4 border border-slate-100 line-clamp-2" title={step.expense.description}>
                      "{step.expense.description || "No description provided"}"
                    </div>

                    {/* Approval Timeline */}
                    {step.expense.approvalSteps && step.expense.approvalSteps.length > 1 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Approval Flow</p>
                        <ApprovalTimeline steps={step.expense.approvalSteps} currentStep={step.expense.currentStep} />
                      </div>
                    )}
                  </div>

                  <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                    <input 
                      type="text" 
                      placeholder="Add a comment... (optional)" 
                      value={comments[step.id] || ''}
                      onChange={(e) => handleCommentChange(step.id, e.target.value)}
                      className="form-input text-sm py-1.5"
                    />
                    <div className="flex gap-3">
                      <button onClick={() => handleDecide(step.id, 'approved')} className="flex-1 primary-btn bg-green-600 hover:bg-green-700 focus:ring-green-500 py-2">
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button onClick={() => handleDecide(step.id, 'rejected')} className="flex-1 danger-btn py-2">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
             <CheckCircle className="text-slate-400" size={20} /> Past Decisions
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Decision</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Comment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {decisions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <Clock className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="text-slate-500 font-medium">No decisions recorded yet</p>
                        <p className="text-sm text-slate-400 mt-1">Your approval history will show up here.</p>
                      </td>
                    </tr>
                  ) : (
                    decisions.map(step => (
                      <tr key={step.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {step.decidedAt ? new Date(step.decidedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {step.expense.employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          {step.expense.convertedAmount && step.expense.currency !== companyCurrency ? (
                            <>
                              <span>{step.expense.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {companyCurrency}</span>
                              <span className="block text-xs text-slate-400">(from {step.expense.amount.toLocaleString()} {step.expense.currency})</span>
                            </>
                          ) : (
                            <span>{step.expense.amount.toLocaleString()} {step.expense.currency}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`badge badge-${step.decision}`}>
                              {step.decision}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={step.comment}>
                          {step.comment || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// Approval Timeline Component (shared between cards and tables)
const ApprovalTimeline = ({ steps, currentStep }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, idx) => {
        const isActive = step.stepOrder === currentStep && step.decision === 'pending';
        return (
          <React.Fragment key={step.id}>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border
              ${step.decision === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                step.decision === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                isActive ? 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-300' :
                'bg-slate-50 text-slate-400 border-slate-200'}
            `}>
              <span className="font-semibold">
                {step.decision === 'approved' ? '✓' : step.decision === 'rejected' ? '✗' : isActive ? '⏳' : '○'}
              </span>
              <span>{step.approver?.name || 'Approver'}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className={`text-xs ${step.decision === 'approved' ? 'text-green-400' : 'text-slate-300'}`}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ManagerDashboard;
