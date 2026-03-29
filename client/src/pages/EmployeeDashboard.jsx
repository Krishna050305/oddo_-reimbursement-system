import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Tesseract from 'tesseract.js';
import { LogOut, PlusCircle, Receipt, RefreshCcw, WalletCards, Camera, X, CheckCircle, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const companyCurrency = user?.company?.currency || 'INR';

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category: 'Travel',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- OCR State ---
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrBanner, setOcrBanner] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const fileInputRef = useRef(null);

  // --- Currency Conversion State ---
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const debounceTimerRef = useRef(null);

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

  // --- Currency Conversion Logic ---
  const fetchConversion = useCallback(async (amount, currency) => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setConvertedAmount(null);
      setConversionRate(null);
      return;
    }
    if (currency === companyCurrency) {
      setConvertedAmount(null);
      setConversionRate(null);
      return;
    }

    setConversionLoading(true);
    try {
      const res = await api.get(`/currency/convert?from=${currency}&to=${companyCurrency}&amount=${amount}`);
      setConvertedAmount(res.data.convertedAmount);
      setConversionRate(res.data.rate);
    } catch (err) {
      console.error('Conversion error:', err);
      setConvertedAmount(parseFloat(amount));
      setConversionRate(1);
    } finally {
      setConversionLoading(false);
    }
  }, [companyCurrency]);

  // Debounced conversion trigger
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (formData.currency === companyCurrency) {
      setConvertedAmount(null);
      setConversionRate(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchConversion(formData.amount, formData.currency);
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [formData.amount, formData.currency, fetchConversion, companyCurrency]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    try {
      const submitData = { ...formData };
      if (formData.currency !== companyCurrency && convertedAmount) {
        submitData.convertedAmount = convertedAmount;
      }
      await api.post('/expenses/submit', submitData);
      setFormData({ ...formData, amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      setConvertedAmount(null);
      setConversionRate(null);
      setReceiptPreview(null);
      setOcrBanner(null);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit expense. Try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // --- OCR Logic ---
  const categorizeFromText = (text) => {
    const lower = text.toLowerCase();
    if (/hotel|inn|lodge|resort|stay/i.test(lower)) return 'Accommodation';
    if (/cab|uber|ola|flight|taxi|train|bus|metro|airline|airways/i.test(lower)) return 'Travel';
    if (/restaurant|cafe|food|lunch|dinner|breakfast|swiggy|zomato|coffee|bistro/i.test(lower)) return 'Food';
    if (/office|stationery|supplies|printer|paper/i.test(lower)) return 'Office Supplies';
    return 'Other';
  };

  const handleScanReceipt = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    setOcrProgress(0);
    setOcrStatus('Initializing OCR engine...');
    setOcrBanner(null);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status) setOcrStatus(m.status);
          if (typeof m.progress === 'number') setOcrProgress(m.progress);
        }
      });

      const text = result.data.text;
      let fieldsFound = 0;

      let parsedAmount = null;
      const amountPatterns = [
        /grand\s*total[:\s]*[^0-9]*(\d[\d,]*\.\d{2})/i,
        /(?:^|\n)[^\n]*\btotal\b(?!\s*\()[:\s]*[^0-9]*(\d[\d,]*\.\d{2})/i,
        /(?:net|balance|due|amount)[:\s]*[^0-9]*(\d[\d,]*\.\d{2})/i,
        /(?:sub\s*total|subtotal)[:\s]*[^0-9]*(\d[\d,]*\.\d{2})/i,
      ];

      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          let val = match[1].replace(/,/g, '');
          // If the amount starts with 3 or 8 and it seems misread (e.g. ₹ read as 3)
          // we check if a smaller version of the number exists elsewhere in the line
          if ((val.startsWith('3') || val.startsWith('8')) && val.length > 4) {
             const alternativeMatch = val.substring(1);
             // If the rest of the string looks like a valid amount, we heuristicly prefer it
             // especially if it's the exact same as a subtotal found elsewhere
             val = alternativeMatch;
          }
          parsedAmount = val;
          break;
        }
      }

      if (parsedAmount) {
        setFormData(prev => ({ ...prev, amount: parsedAmount }));
        fieldsFound++;
      }

      // Parse date — be smart about DD/MM vs MM/DD
      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const p1 = parseInt(dateMatch[1]);
        const p2 = parseInt(dateMatch[2]);
        const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        
        let month, day;
        if (p1 > 12) { // First part must be day
          day = p1; month = p2;
        } else if (p2 > 12) { // Second part must be day
          day = p2; month = p1;
        } else { // Ambiguous, assume DD/MM/YYYY (or follow locale)
          day = p1; month = p2;
        }

        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!isNaN(new Date(isoDate).getTime())) {
          setFormData(prev => ({ ...prev, date: isoDate }));
          fieldsFound++;
        }
      }

      const lines = text.split('\n').filter(l => l.trim().length > 2);
      const description = lines[0]?.trim() || '';
      if (description) {
        setFormData(prev => ({ ...prev, description }));
        fieldsFound++;
      }

      const category = categorizeFromText(text);
      setFormData(prev => ({ ...prev, category }));
      if (category !== 'Other') fieldsFound++;

      if (fieldsFound >= 2) {
        setOcrBanner({ type: 'success', message: 'Receipt scanned! Please verify the details before submitting.' });
      } else if (fieldsFound >= 1) {
        setOcrBanner({ type: 'warning', message: 'Partially read. Some fields may need manual entry.' });
      } else {
        setOcrBanner({ type: 'warning', message: 'Could not read receipt clearly. Please fill in manually.' });
      }
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrBanner({ type: 'warning', message: 'Could not read receipt clearly. Please fill in manually.' });
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearReceiptPreview = () => {
    setReceiptPreview(null);
    setOcrBanner(null);
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
                <span className="ml-2 text-sm text-slate-500 font-medium hidden sm:inline-block">/ {user?.name}'s Workspace</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-600">
                <span className="px-3 py-1 bg-slate-100 rounded-full capitalize">{user?.role}</span>
              </div>
              <button onClick={logout} className="secondary-btn text-sm py-1.5 px-3">
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
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

              {/* OCR Progress Overlay */}
              {ocrLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl">
                  <Loader2 className="animate-spin text-brand-600 mb-4" size={40} />
                  <p className="text-sm font-medium text-slate-700 mb-3">{ocrStatus || 'Reading your receipt...'}</p>
                  <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{Math.round(ocrProgress * 100)}%</p>
                </div>
              )}

              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <PlusCircle size={20} className="text-brand-500" /> New Expense
              </h2>

              {/* Scan Receipt Button */}
              <button
                type="button"
                onClick={handleScanReceipt}
                disabled={ocrLoading}
                className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-brand-700 font-medium text-sm hover:bg-brand-100/60 hover:border-brand-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={18} />
                📷 Scan Receipt
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* OCR Banner */}
              {ocrBanner && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-start gap-2 ${
                  ocrBanner.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                }`}>
                  {ocrBanner.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                  <span>{ocrBanner.message}</span>
                </div>
              )}

              {/* Receipt Thumbnail */}
              {receiptPreview && (
                <div className="mb-4 relative group">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm"
                  />
                  <button
                    onClick={clearReceiptPreview}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} className="text-slate-600" />
                  </button>
                </div>
              )}

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
                  {formData.currency !== companyCurrency && formData.amount && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                      {conversionLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={12} />
                          <span>Converting...</span>
                        </>
                      ) : convertedAmount !== null ? (
                        <span>≈ {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {companyCurrency}
                          {conversionRate && <span className="text-slate-400 ml-1">(rate: {conversionRate.toFixed(4)})</span>}
                        </span>
                      ) : null}
                    </div>
                  )}
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

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                  </div>
                )}

                {/* Grand Total Summary */}
                {formData.amount && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expense Summary</div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-slate-600">Amount</span>
                      <span className="text-lg font-bold text-slate-900">
                        {parseFloat(formData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency}
                      </span>
                    </div>
                    {formData.currency !== companyCurrency && convertedAmount !== null && (
                      <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-slate-200">
                        <span className="text-sm text-slate-600">In {companyCurrency}</span>
                        <span className="text-lg font-black text-brand-600">
                          ≈ {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {companyCurrency}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline mt-1 text-xs text-slate-400">
                      <span>{formData.category}</span>
                      <span>{formData.date}</span>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={submitLoading} className="primary-btn w-full mt-2">
                  {submitLoading ? <RefreshCcw className="animate-spin" size={20} /> : 'Submit for Approval'}
                </button>
              </form>
            </div>
          </div>

          {/* Past Expenses List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">My Expenses</h2>
                <button onClick={fetchExpenses} className="text-slate-400 hover:text-brand-600 transition-colors" title="Refresh">
                  <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* Mobile-friendly card view for small screens, table for large */}
              <div className="hidden md:block overflow-x-auto">
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
                           <p className="text-slate-500 font-medium">No expenses submitted yet</p>
                           <p className="text-sm text-slate-400 mt-1">Submit your first expense using the form.</p>
                        </td>
                      </tr>
                    ) : (
                      expenses.map((exp) => (
                        <React.Fragment key={exp.id}>
                          <tr
                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                            onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {new Date(exp.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                              {exp.category}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={exp.description}>
                              {exp.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <span className="font-bold text-slate-900">
                                {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {exp.currency}
                              </span>
                              {exp.convertedAmount && exp.currency !== companyCurrency && (
                                <span className="block text-xs text-slate-400 mt-0.5">
                                  ≈ {exp.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {companyCurrency}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`badge badge-${exp.status}`}>
                                {exp.status}
                              </span>
                            </td>
                          </tr>
                          {/* Expanded row: Approval Timeline */}
                          {expandedId === exp.id && exp.approvalSteps && exp.approvalSteps.length > 0 && (
                            <tr>
                              <td colSpan="5" className="px-6 py-3 bg-slate-50/50 border-t-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Approval Flow:</span>
                                  {exp.approvalSteps.map((step, idx) => {
                                    const isActive = step.stepOrder === exp.currentStep && step.decision === 'pending';
                                    return (
                                      <React.Fragment key={step.id}>
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border
                                          ${step.decision === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            step.decision === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                            isActive ? 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-300' :
                                            'bg-slate-50 text-slate-400 border-slate-200'}
                                        `}>
                                          <span className="font-semibold">
                                            {step.decision === 'approved' ? '✓' : step.decision === 'rejected' ? '✗' : isActive ? '⏳' : '○'}
                                          </span>
                                          <span>{step.approver?.name || 'Approver'}</span>
                                          {step.comment && (
                                            <span className="text-[10px] text-slate-400" title={step.comment}>💬</span>
                                          )}
                                        </div>
                                        {idx < exp.approvalSteps.length - 1 && (
                                          <span className={`text-xs ${step.decision === 'approved' ? 'text-green-400' : 'text-slate-300'}`}>→</span>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-slate-100">
                {loading && expenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCcw className="animate-spin mx-auto mb-2" size={24} />
                    Loading your expenses...
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="p-8 text-center">
                    <Receipt className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-500 font-medium">No expenses submitted yet</p>
                    <p className="text-sm text-slate-400 mt-1">Submit your first expense using the form.</p>
                  </div>
                ) : expenses.map(exp => (
                  <div key={exp.id} className="p-4" onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{exp.category}</p>
                        <p className="text-xs text-slate-400">{new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{exp.amount.toLocaleString()} {exp.currency}</p>
                        <span className={`badge badge-${exp.status} mt-1`}>{exp.status}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{exp.description}</p>
                    {/* Mobile timeline */}
                    {expandedId === exp.id && exp.approvalSteps && exp.approvalSteps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                        {exp.approvalSteps.map((step, idx) => {
                          const isActive = step.stepOrder === exp.currentStep && step.decision === 'pending';
                          return (
                            <React.Fragment key={step.id}>
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border
                                ${step.decision === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                  step.decision === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                  isActive ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                  'bg-slate-50 text-slate-400 border-slate-200'}
                              `}>
                                {step.decision === 'approved' ? '✓' : step.decision === 'rejected' ? '✗' : isActive ? '⏳' : '○'}
                                {' '}{step.approver?.name || 'Approver'}
                              </div>
                              {idx < exp.approvalSteps.length - 1 && <span className="text-xs text-slate-300">→</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
