import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { LogOut, Users, Receipt, UserPlus, RefreshCcw, WalletCards, ShieldCheck, ChevronUp, ChevronDown, Trash2, Plus, AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  const [team, setTeam] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', role: 'employee', managerId: '', isManagerApprover: false
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // Approval Rule form state
  const [ruleForm, setRuleForm] = useState({
    name: '', ruleType: 'sequential', percentageThreshold: '', specificApproverId: '', approverIds: []
  });
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleError, setRuleError] = useState(null);
  const [ruleSuccess, setRuleSuccess] = useState(null);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTeam = async () => {
    try {
       const res = await api.get('/users/team');
       setTeam(res.data);
    } catch(err) { console.error('Error fetching team', err); }
  };

  const fetchExpenses = async () => {
    try {
       const res = await api.get('/expenses/all');
       setExpenses(res.data);
    } catch(err) { console.error('Error fetching expenses', err); }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/rules');
      setRules(res.data);
    } catch(err) { console.error('Error fetching rules', err); }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTeam(), fetchExpenses(), fetchRules()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary counts
  const totalExpenses = expenses.length;
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;
  const rejectedCount = expenses.filter(e => e.status === 'rejected').length;

  const handleNewUserChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setNewUser({ ...newUser, [e.target.name]: value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      await api.post('/users/create', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'employee', managerId: '', isManagerApprover: false });
      setShowAddUser(false);
      showToast('User created successfully');
      fetchTeam();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  // Approval Rule handlers
  const handleRuleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setRuleForm({ ...ruleForm, [e.target.name]: value });
    setRuleError(null);
    setRuleSuccess(null);
  };

  const addApproverToList = (userId) => {
    if (!userId || ruleForm.approverIds.includes(userId)) return;
    setRuleForm({ ...ruleForm, approverIds: [...ruleForm.approverIds, userId] });
  };

  const removeApproverFromList = (index) => {
    const ids = [...ruleForm.approverIds];
    ids.splice(index, 1);
    setRuleForm({ ...ruleForm, approverIds: ids });
  };

  const moveApprover = (index, direction) => {
    const ids = [...ruleForm.approverIds];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    setRuleForm({ ...ruleForm, approverIds: ids });
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setRuleLoading(true);
    setRuleError(null);
    setRuleSuccess(null);
    try {
      await api.post('/rules/create', {
        companyId: user?.companyId,
        name: ruleForm.name,
        ruleType: ruleForm.ruleType,
        percentageThreshold: ruleForm.percentageThreshold ? parseFloat(ruleForm.percentageThreshold) : null,
        specificApproverId: ruleForm.specificApproverId || null,
        approverIds: ruleForm.approverIds
      });
      setRuleForm({ name: '', ruleType: 'sequential', percentageThreshold: '', specificApproverId: '', approverIds: [] });
      showToast('Approval rule created successfully');
      fetchRules();
    } catch (err) {
      setRuleError(err.response?.data?.error || 'Failed to create rule');
    } finally {
      setRuleLoading(false);
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await api.delete(`/rules/${id}`);
      showToast('Rule deleted');
      fetchRules();
    } catch (err) {
      showToast('Failed to delete rule', 'error');
    }
  };

  const getApproverName = (id) => {
    const u = team.find(t => t.id === id);
    return u ? u.name : 'Unknown';
  };

  const ruleTypeLabel = (type) => {
    const labels = { sequential: 'Sequential', percentage: 'Percentage', specific: 'Specific Approver', hybrid: 'Hybrid' };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}
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
                <span className="ml-2 text-sm text-slate-500 font-medium hidden sm:inline-block">/ Admin Console</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <span className="hidden sm:inline">{user?.name}</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full ml-1 uppercase tracking-wider text-xs font-bold">{user?.role}</span>
              </div>
              <button onClick={logout} className="secondary-btn text-sm py-1.5 px-3">
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalExpenses}</div>
            <div className="text-xs text-slate-400 mt-0.5">expenses</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-yellow-200 shadow-sm">
            <div className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Pending</div>
            <div className="text-2xl font-black text-yellow-700 mt-1">{pendingCount}</div>
            <div className="text-xs text-yellow-500 mt-0.5">awaiting review</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-green-200 shadow-sm">
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-black text-green-700 mt-1">{approvedCount}</div>
            <div className="text-xs text-green-500 mt-0.5">cleared</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-red-200 shadow-sm">
            <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">Rejected</div>
            <div className="text-2xl font-black text-red-700 mt-1">{rejectedCount}</div>
            <div className="text-xs text-red-500 mt-0.5">declined</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 sm:space-x-4 mb-8 border-b border-slate-200 overflow-x-auto">
          <button 
             onClick={() => setActiveTab('users')} 
             className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={18} /> Team Members
          </button>
          <button 
             onClick={() => setActiveTab('expenses')} 
             className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'expenses' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Receipt size={18} /> All Expenses
          </button>
          <button 
             onClick={() => setActiveTab('rules')} 
             className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rules' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck size={18} /> Approval Rules
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 fade-in">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-900">Company Users</h2>
               <button onClick={() => setShowAddUser(!showAddUser)} className="primary-btn text-sm py-2">
                 <UserPlus size={16} /> Add User
               </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="glass-panel p-6 rounded-2xl relative border-brand-200 shadow-brand-100/50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Team Member</h3>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Name</label>
                    <input type="text" name="name" value={newUser.name} onChange={handleNewUserChange} className="mt-1 form-input py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" name="email" value={newUser.email} onChange={handleNewUserChange} className="mt-1 form-input py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <input type="password" name="password" value={newUser.password} onChange={handleNewUserChange} className="mt-1 form-input py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Role</label>
                    <select name="role" value={newUser.role} onChange={handleNewUserChange} className="mt-1 form-input py-2">
                       <option value="employee">Employee</option>
                       <option value="manager">Manager</option>
                       <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Assign Manager</label>
                    <select name="managerId" value={newUser.managerId} onChange={handleNewUserChange} className="mt-1 form-input py-2">
                       <option value="">-- No Manager --</option>
                       {team.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer mt-5 bg-white px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors w-full">
                       <input type="checkbox" name="isManagerApprover" checked={newUser.isManagerApprover} onChange={handleNewUserChange} className="w-5 h-5 text-brand-600 rounded bg-slate-100 focus:ring-brand-500 border-slate-300" />
                       <span className="text-sm font-medium text-slate-800">Can Approve Subordinates' Expenses?</span>
                    </label>
                  </div>

                  {addError && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{addError}</div>}
                  
                  <div className="md:col-span-2 flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setShowAddUser(false)} className="secondary-btn">Cancel</button>
                    <button type="submit" disabled={addLoading} className="primary-btn w-32">
                      {addLoading ? <RefreshCcw className="animate-spin" size={16} /> : 'Save User'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-200">
                   <thead className="bg-slate-50">
                     <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Manager</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-slate-100">
                     {loading ? (
                       <tr><td colSpan="4" className="px-6 py-8 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-400" /></td></tr>
                     ) : team.length === 0 ? (
                       <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                         <Users className="mx-auto mb-2 text-slate-300" size={32} />
                         <p className="font-medium text-slate-500">No team members yet</p>
                         <p className="text-sm mt-1">Click "Add User" to get started.</p>
                       </td></tr>
                     ) : team.map(member => (
                       <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{member.name}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{member.email}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 capitalize font-medium">{member.role} {member.isManagerApprover && <span className="text-xs ml-2 text-brand-600 font-bold bg-brand-50 px-2 rounded-full">Approver</span>}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{member.manager ? member.manager.name : '—'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-900">All Company Expenses</h2>
               <button onClick={fetchExpenses} className="secondary-btn text-sm py-2">
                 <RefreshCcw size={16} className={loading && activeTab === 'expenses' ? "animate-spin" : ""} /> Refresh
               </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-200">
                   <thead className="bg-slate-50">
                     <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Approval Flow</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-slate-100">
                     {loading ? (
                       <tr><td colSpan="6" className="px-6 py-8 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-400" /></td></tr>
                     ) : expenses.length === 0 ? (
                       <tr><td colSpan="6" className="px-6 py-12 text-center">
                         <Receipt className="mx-auto mb-2 text-slate-300" size={32} />
                         <p className="text-slate-500 font-medium">No expenses found</p>
                         <p className="text-sm text-slate-400 mt-1">Expenses will appear here once submitted by employees.</p>
                       </td></tr>
                     ) : expenses.map(exp => (
                       <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                           {new Date(exp.date).toLocaleDateString()}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                           {exp.employee.name}
                           <div className="text-xs font-normal text-slate-400">{exp.employee.email}</div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-700 font-bold">
                           {exp.amount.toLocaleString()} {exp.currency}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                           {exp.category}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`badge badge-${exp.status}`}>
                              {exp.status}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                           <ApprovalTimeline steps={exp.approvalSteps} currentStep={exp.currentStep} />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* Approval Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Approval Rules</h2>
            </div>

            {/* Rule Builder Form */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-brand-500" /> Create New Rule
              </h3>
              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Rule Name</label>
                    <input type="text" name="name" value={ruleForm.name} onChange={handleRuleChange} className="mt-1 form-input py-2" placeholder="e.g. Standard Approval Chain" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Rule Type</label>
                    <select name="ruleType" value={ruleForm.ruleType} onChange={handleRuleChange} className="mt-1 form-input py-2">
                      <option value="sequential">Sequential</option>
                      <option value="percentage">Percentage</option>
                      <option value="specific">Specific Approver</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Sequential: Approver ordering */}
                {(ruleForm.ruleType === 'sequential' || ruleForm.ruleType === 'hybrid') && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Approval Chain Order</label>
                    <div className="flex gap-2 mb-3">
                      <select className="form-input py-2 flex-1" id="approverSelect">
                        <option value="">-- Select Approver --</option>
                        {team.filter(t => t.isManagerApprover).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = document.getElementById('approverSelect');
                          addApproverToList(sel.value);
                          sel.value = '';
                        }}
                        className="primary-btn py-2 px-4 text-sm"
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                    {ruleForm.approverIds.length === 0 ? (
                      <p className="text-sm text-slate-400 py-3 text-center">No approvers added yet. Select from the dropdown above.</p>
                    ) : (
                      <div className="space-y-2">
                        {ruleForm.approverIds.map((id, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200">
                            <span className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-800 flex-1">{getApproverName(id)}</span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => moveApprover(idx, -1)} className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-30" disabled={idx === 0}>
                                <ChevronUp size={14} />
                              </button>
                              <button type="button" onClick={() => moveApprover(idx, 1)} className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-30" disabled={idx === ruleForm.approverIds.length - 1}>
                                <ChevronDown size={14} />
                              </button>
                              <button type="button" onClick={() => removeApproverFromList(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Percentage */}
                {(ruleForm.ruleType === 'percentage' || ruleForm.ruleType === 'hybrid') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Threshold Percentage</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input type="number" name="percentageThreshold" value={ruleForm.percentageThreshold} onChange={handleRuleChange} className="form-input py-2 w-32" placeholder="60" min="1" max="100" />
                      <span className="text-sm text-slate-500">% of approvers must approve</span>
                    </div>
                  </div>
                )}

                {/* Specific Approver */}
                {(ruleForm.ruleType === 'specific' || ruleForm.ruleType === 'hybrid') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Key Approver</label>
                    <select name="specificApproverId" value={ruleForm.specificApproverId} onChange={handleRuleChange} className="mt-1 form-input py-2">
                      <option value="">-- Select Key Approver --</option>
                      {team.filter(t => t.isManagerApprover).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">If this person approves, the expense is auto-approved regardless of other votes.</p>
                  </div>
                )}

                {ruleError && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} /> {ruleError}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={ruleLoading} className="primary-btn w-40">
                    {ruleLoading ? <RefreshCcw className="animate-spin" size={16} /> : 'Save Rule'}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Rules */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Saved Rules</h3>
              </div>
              {rules.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldCheck className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-slate-500 font-medium">No approval rules configured</p>
                  <p className="text-sm text-slate-400 mt-1">Create your first rule above to automate approval workflows.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-medium text-slate-900">{rule.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">{ruleTypeLabel(rule.ruleType)}</span>
                          {rule.percentageThreshold && <span className="text-xs text-slate-400">{rule.percentageThreshold}% threshold</span>}
                          {rule.specificApproverId && <span className="text-xs text-slate-400">Key: {getApproverName(rule.specificApproverId)}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

// Approval Timeline Component
const ApprovalTimeline = ({ steps, currentStep }) => {
  if (!steps || steps.length === 0) {
    return <span className="text-xs text-slate-400 italic">No approval chain</span>;
  }

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
              <span className="hidden sm:inline">{step.approver?.name || 'Approver'}</span>
              <span className="sm:hidden">{step.approver?.role || 'Step'}</span>
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

export default AdminDashboard;
