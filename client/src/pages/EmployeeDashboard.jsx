import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { LogOut, PlusCircle, Receipt, RefreshCcw, WalletCards } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category: 'Travel',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses/my');
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    try {
      await api.post('/expenses/submit', formData);
      setFormData({ ...formData, amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      fetchExpenses(); // Refresh the list
    } catch (err) {
      setError('Failed to submit expense. Try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar segment */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="text-brand-600 bg-brand-50 p-2 rounded-xl">
                <WalletCards size={24} />
              </div>
              <div>
                <span className="font-bold text-xl text-slate-800 tracking-tight">Oddo</span>
                <span className="ml-2 text-sm text-slate-500 font-medium hidden sm:inline-block">/ {user?.name}'s Workspace</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-600">
                <span className="px-3 py-1 bg-slate-100 rounded-full">{user?.role}</span>
              </div>
              <button onClick={logout} className="secondary-btn text-sm py-1.5 px-3">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Submit Expense Form column */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Receipt size={120} />
               </div>
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <PlusCircle size={20} className="text-brand-500" /> New Expense
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount</label>
                  <div className="mt-1 flex gap-2">
                    <select name="currency" value={formData.currency} onChange={handleChange} className="form-input w-24 px-2">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                      <option value="JPY">JPY</option>
                    </select>
                    <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="form-input flex-1" placeholder="0.00" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="mt-1 form-input w-full">
                    <option value="Travel">Travel</option>
                    <option value="Food">Food</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 form-input w-full" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} className="mt-1 form-input w-full resize-none h-24" placeholder="Brief description of the expense..." required></textarea>
                </div>

                {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

                <button type="submit" disabled={submitLoading} className="primary-btn w-full mt-2">
                  {submitLoading ? <RefreshCcw className="animate-spin" size={20} /> : 'Submit for Approval'}
                </button>
              </form>
            </div>
          </div>

          {/* Past Expenses Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">My Expenses</h2>
                <button onClick={fetchExpenses} className="text-slate-400 hover:text-brand-600 transition-colors" title="Refresh">
                  <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {loading && expenses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                          <RefreshCcw className="animate-spin mx-auto mb-2" size={24} />
                          Loading your expenses...
                        </td>
                      </tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                           <Receipt className="mx-auto text-slate-300 mb-3" size={32} />
                           <p className="text-slate-500 font-medium">No expenses submitted yet.</p>
                           <p className="text-sm text-slate-400 mt-1">Submit your first expense using the form.</p>
                        </td>
                      </tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {new Date(exp.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {exp.category}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={exp.description}>
                            {exp.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                            {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {exp.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`badge badge-${exp.status}`}>
                              {exp.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
