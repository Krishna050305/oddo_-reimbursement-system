import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { LogOut, Users, Receipt, UserPlus, RefreshCcw, WalletCards } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'expenses'
  
  const [team, setTeam] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', role: 'employee', managerId: '', isManagerApprover: false
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

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

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTeam(), fetchExpenses()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
      fetchTeam(); // Refresh
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
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
                <span>{user?.name}</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full ml-1 uppercase tracking-wider text-xs font-bold">{user?.role}</span>
              </div>
              <button onClick={logout} className="secondary-btn text-sm py-1.5 px-3">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-slate-200">
          <button 
             onClick={() => setActiveTab('users')} 
             className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'users' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={18} /> Team Members
          </button>
          <button 
             onClick={() => setActiveTab('expenses')} 
             className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'expenses' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Receipt size={18} /> All Expenses
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
                     ) : team.map(member => (
                       <tr key={member.id}>
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
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-slate-100">
                     {loading ? (
                       <tr><td colSpan="5" className="px-6 py-8 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-400" /></td></tr>
                     ) : expenses.length === 0 ? (
                       <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No expenses found for the company.</td></tr>
                     ) : expenses.map(exp => (
                       <tr key={exp.id}>
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
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
