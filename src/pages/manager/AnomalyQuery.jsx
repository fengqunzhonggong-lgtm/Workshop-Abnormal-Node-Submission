import { useState, useEffect } from 'react';
import api from '../../api';

export default function AnomalyQuery() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    work_order_no:'', product_model_name:'', abnormal_type_id:'', source_department_id:'',
    source_process_id:'', found_process_id:'', date_from:'', date_to:'', keyword:'',
  });
  const [abnormalTypes, setAbnormalTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [foundProcesses, setFoundProcesses] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/base-data/abnormal_types'),
      api.get('/base-data/source_departments'), api.get('/base-data/found_processes'),
    ]).then(([at, sd, fp]) => {
      setAbnormalTypes(at.data);
      setDepartments(sd.data); setFoundProcesses(fp.data);
    }).catch(() => {});
  }, []);

  const fetchData = (p = 1) => {
    setLoading(true);
    const params = { page: p, page_size: 20 };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/anomalies', { params }).then(res => {
      setRecords(res.data.items); setTotal(res.data.total); setPage(p);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(1); }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const viewDetail = async (id) => {
    try {
      const res = await api.get(`/anomalies/${id}`);
      setDetail(res.data);
    } catch { }
  };

  const totalPages = Math.ceil(total / 20);
  const inputClass = "px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs";

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">异常查询</h2>
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <input name="keyword" value={filters.keyword} onChange={handleFilterChange} className={inputClass} placeholder="关键词搜索" />
          <input name="work_order_no" value={filters.work_order_no} onChange={handleFilterChange} className={inputClass} placeholder="工单号" />
          <input name="product_model_name" value={filters.product_model_name} onChange={handleFilterChange} className={inputClass} placeholder="产品型号" />
          <select name="abnormal_type_id" value={filters.abnormal_type_id} onChange={handleFilterChange} className={inputClass}>
            <option value="">全部类别</option>
            {abnormalTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select name="source_department_id" value={filters.source_department_id} onChange={handleFilterChange} className={inputClass}>
            <option value="">全部部门</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select name="found_process_id" value={filters.found_process_id} onChange={handleFilterChange} className={inputClass}>
            <option value="">全部发现工序</option>
            {foundProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} className={inputClass} />
          <input name="date_to" type="date" value={filters.date_to} onChange={handleFilterChange} className={inputClass} />
          <button onClick={() => fetchData(1)} className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700">查询</button>
          <button onClick={() => setFilters(Object.keys(filters).reduce((a,k)=>({...a,[k]:''}),{}))} className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-xs hover:bg-gray-200">重置</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-x-auto shadow-sm border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">编号</th><th className="px-3 py-2 text-left font-medium">工单号</th>
              <th className="px-3 py-2 text-left font-medium">型号</th><th className="px-3 py-2 text-left font-medium">类型</th>
              <th className="px-3 py-2 text-left font-medium">部门</th><th className="px-3 py-2 text-left font-medium">工序</th>
              <th className="px-3 py-2 text-left font-medium">提交人</th><th className="px-3 py-2 text-left font-medium">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">加载中...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">暂无记录</td></tr>
            ) : records.map(r => (
              <tr key={r.id} onClick={() => viewDetail(r.id)} className="hover:bg-blue-50 text-gray-700 cursor-pointer transition-colors">
                <td className="px-3 py-2 text-blue-600 font-medium">{r.record_no}</td>
                <td className="px-3 py-2">{r.work_order_no}</td>
                <td className="px-3 py-2">{r.product_model_name}</td>
                <td className="px-3 py-2">{r.abnormal_type_name}</td>
                <td className="px-3 py-2">{r.source_department_name}</td>
                <td className="px-3 py-2">{r.found_process_name}</td>
                <td className="px-3 py-2">{r.submitter_name}</td>
                <td className="px-3 py-2 text-gray-400">{r.created_at?.slice(0,10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button onClick={() => fetchData(page-1)} disabled={page<=1} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50">上一页</button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => fetchData(page+1)} disabled={page>=totalPages} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50">下一页</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">异常详情 - {detail.record_no}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['异常编号', detail.record_no], ['工单号', detail.work_order_no],
                  ['产品型号', detail.product_model_name], ['异常类别', detail.abnormal_type_name],
                  ['数量', detail.quantity], ['来源部门', detail.source_department_name],
                  ['来源工序', detail.source_process_name], ['发现工序', detail.found_process_name],
                  ['提交人', detail.submitter_name], ['工号', detail.submitter_employee_id],
                  ['提交时间', detail.created_at?.slice(0, 19)],
                ].map(([label, value], i) => (
                  <div key={i} className={i >= 10 ? 'col-span-2' : ''}>
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-gray-700">{value}</div>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">异常描述</div>
                  <div className="text-gray-700 text-xs bg-gray-50 rounded-lg p-2">{detail.description}</div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-right">
              <button onClick={() => setDetail(null)} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
