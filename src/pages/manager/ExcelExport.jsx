import { useState } from 'react';
import api from '../../api';

export default function ExcelExport() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', work_order_no: '', product_model_name: '' });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/export/excel', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `异常记录_导出_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { }
    setExporting(false);
  };

  const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:border-blue-500";

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Excel导出</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">开始日期</label>
          <input type="date" value={filters.date_from} onChange={e => setFilters(p=>({...p,date_from:e.target.value}))} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">结束日期</label>
          <input type="date" value={filters.date_to} onChange={e => setFilters(p=>({...p,date_to:e.target.value}))} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">工单号（可选）</label>
          <input value={filters.work_order_no} onChange={e => setFilters(p=>({...p,work_order_no:e.target.value}))} className={inputClass} placeholder="输入工单号" />
        </div>
        <button onClick={handleExport} disabled={exporting} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl text-white font-medium text-sm transition-colors shadow-sm">
          {exporting ? '导出中...' : '导出 Excel'}
        </button>
      </div>
    </div>
  );
}
