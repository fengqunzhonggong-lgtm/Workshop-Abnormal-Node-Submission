import { useState, useEffect } from 'react';
import api from '../../api';

const TABLES = [
  {key:'abnormal_types',label:'异常类别'},
  {key:'source_departments',label:'来源部门'},{key:'source_processes',label:'来源工序'},
  {key:'found_processes',label:'发现工序'},
];

export default function BaseData() {
  const [tab, setTab] = useState('abnormal_types');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [deptId, setDeptId] = useState('');
  const [departments, setDepartments] = useState([]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/base-data/${tab}`);
      setItems(res.data);
      if(tab==='source_processes') { const dr = await api.get('/base-data/source_departments'); setDepartments(dr.data); }
    } catch { }
    setLoading(false);
  };
  useEffect(() => { fetchItems(); setShowForm(false); setEditItem(null); }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!name.trim()) return;
    try {
      if(editItem) await api.put(`/base-data/${tab}/${editItem.id}`, { name: name.trim(), department_id: deptId||null });
      else await api.post(`/base-data/${tab}`, { name: name.trim(), department_id: deptId||null });
      setName(''); setDeptId(''); setShowForm(false); setEditItem(null); fetchItems();
    } catch(err) { alert(err.response?.data?.error||'操作失败'); }
  };

  const handleToggle = async (item) => {
    try { await api.put(`/base-data/${tab}/${item.id}`, { is_active: item.is_active?0:1 }); fetchItems(); } catch { }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">基础数据维护</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {TABLES.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tab===t.key?'bg-blue-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>
        ))}
      </div>
      <div className="flex justify-end mb-3">
        <button onClick={()=>{setShowForm(true);setEditItem(null);setName('');setDeptId('');}} className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700">新增</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-3 mb-3 shadow-sm border border-gray-100 space-y-2">
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm" placeholder="名称" autoFocus />
          {tab==='source_processes' && (
            <select value={deptId} onChange={e=>setDeptId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm">
              <option value="">所属部门（可选）</option>
              {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs">{editItem?'更新':'创建'}</button>
            <button type="button" onClick={()=>{setShowForm(false);setEditItem(null);}} className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-xs">取消</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2 text-left font-medium">ID</th><th className="px-3 py-2 text-left font-medium">名称</th>{tab==='source_processes'&&<th className="px-3 py-2 text-left font-medium">所属部门</th>}<th className="px-3 py-2 text-center font-medium">状态</th><th className="px-3 py-2 text-center font-medium">操作</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">加载中...</td></tr> :
            items.length===0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">暂无数据</td></tr> :
            items.map(item=>(
              <tr key={item.id} className="hover:bg-gray-50 text-gray-700">
                <td className="px-3 py-2 text-gray-400">{item.id}</td><td className="px-3 py-2">{item.name}</td>
                {tab==='source_processes'&&<td className="px-3 py-2 text-gray-400">{item.department_id?departments.find(d=>d.id===item.department_id)?.name||'-':'-'}</td>}
                <td className="px-3 py-2 text-center"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${item.is_active?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{item.is_active?'启用':'停用'}</span></td>
                <td className="px-3 py-2 text-center">
                  <button onClick={()=>{setEditItem(item);setName(item.name);setDeptId(item.department_id||'');setShowForm(true);}} className="px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded text-xs mr-1">编辑</button>
                  <button onClick={()=>handleToggle(item)} className={`px-2 py-0.5 rounded text-xs ${item.is_active?'text-red-500 hover:bg-red-50':'text-green-600 hover:bg-green-50'}`}>{item.is_active?'停用':'启用'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
