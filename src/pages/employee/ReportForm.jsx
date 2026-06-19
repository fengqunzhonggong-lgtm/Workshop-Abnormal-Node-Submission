import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ReportForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    work_order_no: '', product_model_name: '', abnormal_type_id: '', quantity: 1,
    source_department_id: '', source_process_id: '', found_process_id: '', description: '',
  });
  const [abnormalTypes, setAbnormalTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sourceProcesses, setSourceProcesses] = useState([]);
  const [foundProcesses, setFoundProcesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/base-data/abnormal_types'),
      api.get('/base-data/source_departments'), api.get('/base-data/found_processes'),
    ]).then(([at, sd, fp]) => {
      setAbnormalTypes(at.data.filter(d => d.is_active));
      setDepartments(sd.data.filter(d => d.is_active));
      setFoundProcesses(fp.data.filter(d => d.is_active));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.source_department_id) {
      api.get(`/base-data/source_processes?department_id=${form.source_department_id}`)
        .then(res => setSourceProcesses(res.data.filter(d => d.is_active)))
        .catch(() => setSourceProcesses([]));
    } else setSourceProcesses([]);
  }, [form.source_department_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.work_order_no || !form.product_model_name || !form.abnormal_type_id || !form.source_department_id || !form.source_process_id || !form.found_process_id) {
      setMsg({ type: 'error', text: '请填写所有必填字段' });
      return;
    }
    setLoading(true); setMsg(null);
    try {
      const res = await api.post('/anomalies', { ...form, product_model_name: form.product_model_name.trim(), quantity: parseInt(form.quantity) || 1 });
      setMsg({ type: 'success', recordNo: res.data.record_no, text: '提交成功！异常编号：' + res.data.record_no });
      setForm(prev => ({ ...prev, work_order_no: '', quantity: 1, description: '' }));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '提交失败' });
    } finally { setLoading(false); }
  };

  const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const labelClass = "block text-xs text-gray-500 mb-1 font-medium";

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">异常填报</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <label className={labelClass}>提交人</label>
          <input type="text" value={`${user?.name} (${user?.employee_id})`} disabled className="w-full px-3 py-2 bg-gray-100 rounded-xl text-gray-400 text-sm" />
        </div>
        <div>
          <label className={labelClass}>工单号 <span className="text-red-500">*</span></label>
          <input name="work_order_no" value={form.work_order_no} onChange={handleChange} className={inputClass} placeholder="请输入工单号" />
        </div>
        <div>
          <label className={labelClass}>产品型号 <span className="text-red-500">*</span></label>
          <input name="product_model_name" value={form.product_model_name} onChange={handleChange} className={inputClass} placeholder="请输入产品型号" autoComplete="off" />
        </div>
        <div>
          <label className={labelClass}>异常类别 <span className="text-red-500">*</span></label>
          <select name="abnormal_type_id" value={form.abnormal_type_id} onChange={handleChange} className={inputClass}>
            <option value="">请选择</option>
            {abnormalTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>数量</label>
          <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>来源部门 <span className="text-red-500">*</span></label>
          <select name="source_department_id" value={form.source_department_id} onChange={handleChange} className={inputClass}>
            <option value="">请选择</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>来源工序 <span className="text-red-500">*</span></label>
          <select name="source_process_id" value={form.source_process_id} onChange={handleChange} className={inputClass} disabled={!form.source_department_id}>
            <option value="">请选择</option>
            {sourceProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>发现工序 <span className="text-red-500">*</span></label>
          <select name="found_process_id" value={form.found_process_id} onChange={handleChange} className={inputClass}>
            <option value="">请选择</option>
            {foundProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>异常描述</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass + " resize-none"} placeholder="请描述异常情况" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-white font-medium text-sm transition-colors shadow-sm">
          {loading ? '提交中...' : '提交'}
        </button>
      </form>

      {/* Full-screen result overlay */}
      {msg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => msg.type === 'error' && setMsg(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-8 text-center">
              {msg.type === 'success' ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-green-700 mb-2">提交成功</h3>
                  <p className="text-sm text-gray-500 mb-1">异常编号</p>
                  <p className="text-2xl font-bold text-blue-600 mb-2">{msg.recordNo}</p>
                  <p className="text-xs text-gray-400">请记录下来以便后续查询</p>
                  <button
                    onClick={() => setMsg(null)}
                    className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium text-sm transition-colors"
                  >
                    继续填报
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-red-600 mb-2">提交失败</h3>
                  <p className="text-sm text-gray-600">{msg.text}</p>
                  <button
                    onClick={() => setMsg(null)}
                    className="mt-6 w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium text-sm transition-colors"
                  >
                    关闭
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
