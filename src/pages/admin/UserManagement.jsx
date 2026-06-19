import { useState, useEffect } from 'react';
import api from '../../api';

const roleLabel = r => ({superadmin:'系统管理员',manager:'管理人员',employee:'员工'})[r]||r;

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ employee_id:'', name:'', password:'', role:'employee' });
  const [resetPw, setResetPw] = useState({ show:false, userId:null, password:'' });

  const fetchUsers = async () => {
    setLoading(true);
    try { const res = await api.get('/users'); setUsers(res.data); } catch { }
    setLoading(false);
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!form.employee_id||!form.name||!form.password) return;
    try { await api.post('/users', form); setShowForm(false); setForm({employee_id:'',name:'',password:'',role:'employee'}); fetchUsers(); }
    catch(err) { alert(err.response?.data?.error||'创建失败'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try { await api.put(`/users/${editUser.id}`, { name:form.name, role:form.role }); setShowForm(false); setEditUser(null); fetchUsers(); }
    catch(err) { alert(err.response?.data?.error||'更新失败'); }
  };

  const handleToggle = async (user) => {
    if(!confirm(`确认${user.is_active?'停用':'启用'}用户 ${user.name}？`)) return;
    try { await api.put(`/users/${user.id}/toggle-status`); fetchUsers(); } catch { }
  };

  const handleResetPw = async (e) => {
    e.preventDefault();
    try { await api.put(`/users/${resetPw.userId}/reset-password`, { password: resetPw.password }); setResetPw({show:false,userId:null,password:''}); }
    catch(err) { alert(err.response?.data?.error||'操作失败'); }
  };

  const iCls = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm";

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">用户管理</h2>
      <div className="flex justify-end mb-3">
        <button onClick={()=>{setShowForm(true);setEditUser(null);setForm({employee_id:'',name:'',password:'',role:'employee'});}} className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700">新增用户</button>
      </div>
      {showForm && (
        <form onSubmit={editUser?handleEdit:handleCreate} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 space-y-3">
          {!editUser&&<div><label className="block text-xs text-gray-500 mb-1 font-medium">工号</label><input value={form.employee_id} onChange={e=>setForm(p=>({...p,employee_id:e.target.value}))} className={iCls} /></div>}
          <div><label className="block text-xs text-gray-500 mb-1 font-medium">姓名</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={iCls} /></div>
          {!editUser&&<div><label className="block text-xs text-gray-500 mb-1 font-medium">密码</label><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} className={iCls} /></div>}
          <div><label className="block text-xs text-gray-500 mb-1 font-medium">角色</label><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} className={iCls}><option value="employee">员工</option><option value="manager">管理人员</option><option value="superadmin">系统管理员</option></select></div>
          <div className="flex gap-2"><button type="submit" className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs">{editUser?'更新':'创建'}</button><button type="button" onClick={()=>{setShowForm(false);setEditUser(null);}} className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-xs">取消</button></div>
        </form>
      )}
      {resetPw.show && (
        <form onSubmit={handleResetPw} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-sm text-gray-800 font-medium">重置密码</h3>
          <input type="password" value={resetPw.password} onChange={e=>setResetPw(p=>({...p,password:e.target.value}))} className={iCls} placeholder="新密码" />
          <div className="flex gap-2"><button type="submit" className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs">确认</button><button type="button" onClick={()=>setResetPw({show:false,userId:null,password:''})} className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-xs">取消</button></div>
        </form>
      )}
      <div className="bg-white rounded-2xl overflow-x-auto shadow-sm border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2 text-left font-medium">工号</th><th className="px-3 py-2 text-left font-medium">姓名</th><th className="px-3 py-2 text-left font-medium">角色</th><th className="px-3 py-2 text-center font-medium">状态</th><th className="px-3 py-2 text-center font-medium">操作</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">加载中...</td></tr> :
            users.map(u=>(
              <tr key={u.id} className="hover:bg-gray-50 text-gray-700">
                <td className="px-3 py-2">{u.employee_id}</td><td className="px-3 py-2">{u.name}</td><td className="px-3 py-2">{roleLabel(u.role)}</td>
                <td className="px-3 py-2 text-center"><span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${u.is_active?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{u.is_active?'正常':'停用'}</span></td>
                <td className="px-3 py-2 text-center">
                  <button onClick={()=>{setEditUser(u);setForm({name:u.name,role:u.role});setShowForm(true);}} className="px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded text-xs mr-1">编辑</button>
                  <button onClick={()=>setResetPw({show:true,userId:u.id,password:''})} className="px-2 py-0.5 text-yellow-600 hover:bg-yellow-50 rounded text-xs mr-1">重置密码</button>
                  <button onClick={()=>handleToggle(u)} className={`px-2 py-0.5 rounded text-xs ${u.is_active?'text-red-500 hover:bg-red-50':'text-green-600 hover:bg-green-50'}`}>{u.is_active?'停用':'启用'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
