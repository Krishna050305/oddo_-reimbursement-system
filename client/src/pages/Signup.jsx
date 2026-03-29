import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { WalletCards } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', companyName: '', country: '', currency: 'USD'
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    if (Object.values(formData).some(v => !v)) {
      setError("Please fill all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/signup', formData);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm -z-10" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center text-brand-400 drop-shadow-lg">
          <WalletCards size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white drop-shadow-md">
          Create new workspace
        </h2>
        <p className="mt-2 text-center text-sm text-slate-200">
          Or <Link to="/login" className="font-medium text-brand-300 hover:text-brand-200 transition-colors">sign in to an existing account</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10">
        <div className="glass-panel py-8 px-4 sm:rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700">Company Name</label>
                  <input name="companyName" value={formData.companyName} onChange={handleChange} className="mt-1 form-input" placeholder="Acme Corp" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700">Country</label>
                  <input name="country" value={formData.country} onChange={handleChange} className="mt-1 form-input" placeholder="USA" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Currency</label>
                <select name="currency" value={formData.currency} onChange={handleChange} className="mt-1 form-input">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700">Admin Name</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="mt-1 form-input" placeholder="John Doe" />
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Admin Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 form-input" placeholder="admin@acme.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Admin Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 form-input" placeholder="••••••••" />
            </div>

            {error && <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

            <div className="pt-2">
              <button type="submit" disabled={loading} className="primary-btn w-full py-3 text-lg">
                {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
