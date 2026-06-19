import { useState, useEffect } from 'react';
import api from '../../api';

export default function MyRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ date_from: '', date_to: '', keyword: '' });

  const fmt = d => { const dt = new Date(d); return dt.toISOString().slice(0, 10); };
  const today = () => fmt(new Date());
  const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return fmt(d); };
  const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };

  const setToday = () => setFilter(prev => ({ ...prev, date_from: today(), date_to: today() }));
  const setThisWeek = () => setFilter(prev => ({ ...prev, date_from: weekStart(), date_to: today() }));
  const setThisMonth = () => setFilter(prev => ({ ...prev, date_from: monthStart(), date_to: today() }));

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (filter.date_from) params.date_from = filter.date_from;
      if (filter.date_to) params.date_to = filter.date_to;
      if (filter.keyword) params.keyword = filter.keyword;
      const res = await api.get('/anomalies', { params });
      setRecords(res.data.items);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">我的记录</h2>

      <div className="flex gap-2 mb-3">
        {[{label:'今天',fn:setToday},{label:'本周',fn:setThisWeek},{label:'本月',fn:setThisMonth}].map(f => (
          <button key={f.label} onClick={f.fn} className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">{f.label}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input type="date" value={filter.date_from} onChange={e => setFilter(p=>({...p,date_from:e.target.value}))} className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-800 text-xs" />
        <input type="date" value={filter.date_to} onChange={e => setFilter(p=>({...p,date_to:e.target.value}))} className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-800 text-xs" />
        <button onClick={fetchRecords} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs transition-colors">查询</button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8 text-sm">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">暂无记录</div>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-1">
                <span className="text-gray-800 text-sm font-medium">{r.record_no}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status==='open'?'bg-yellow-50 text-yellow-700':'bg-green-50 text-green-700'}`}>
                  {r.status==='open'?'待处理':'已解决'}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>工单：{r.work_order_no} | 类型：{r.abnormal_type_name}</div>
                <div>来源：{r.source_department_name} / {r.source_process_name}</div>
                <div>发现：{r.found_process_name}</div>
                <div className="text-gray-400 mt-1">{r.description?.slice(0,60)}{r.description?.length>60?'...':''}</div>
                <div className="text-gray-400 mt-1">提交：{r.created_at}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
