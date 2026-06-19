import { useState, useEffect } from 'react';
import api from '../../api';

export default function SystemManagement() {
  const [backupMsg, setBackupMsg] = useState('');
  const [archiveYear, setArchiveYear] = useState('');
  const [archiveMsg, setArchiveMsg] = useState('');
  const [deleteDate, setDeleteDate] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  const handleBackup = async () => {
    setBackupMsg(''); if(!confirm('确认备份当前数据库？')) return;
    try { const res = await api.post('/system/backup'); setBackupMsg(res.data.message); }
    catch(err) { setBackupMsg(err.response?.data?.error||'备份失败'); }
  };

  const handleArchive = async () => {
    setArchiveMsg(''); if(!archiveYear) return;
    if(!confirm(`确认归档 ${archiveYear} 年所有记录？`)) return;
    try { const res = await api.post('/system/archive', { year: parseInt(archiveYear) }); setArchiveMsg(res.data.message); }
    catch(err) { setArchiveMsg(err.response?.data?.error||'归档失败'); }
  };

  const handleDelete = async () => {
    setDeleteMsg(''); if(!deleteDate) return;
    if(!confirm(`删除 ${deleteDate} 之前所有记录？不可恢复！`)) return;
    if(!confirm('请再次确认：删除后无法恢复！')) return;
    try { const res = await api.delete('/system/history', { data: { before_date: deleteDate } }); setDeleteMsg(res.data.message); }
    catch(err) { setDeleteMsg(err.response?.data?.error||'删除失败'); }
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await api.get('/system/status');
      setDiagnostics(res.data);
    } catch(err) {
      setDiagnostics({ error: err.response?.data?.error || '检测失败' });
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => { runDiagnostics(); }, []);

  const statusIcon = (s) => {
    switch(s) {
      case 'ok': return <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>;
      case 'warn': return <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs">!</span>;
      case 'error': return <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs">✕</span>;
      case 'repaired': return <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">↻</span>;
      default: return null;
    }
  };

  const statusColor = (s) => {
    switch(s) {
      case 'ok': return 'border-green-200 bg-green-50/30';
      case 'warn': return 'border-yellow-200 bg-yellow-50/30';
      case 'error': return 'border-red-200 bg-red-50/30';
      case 'repaired': return 'border-blue-200 bg-blue-50/30';
      default: return '';
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">系统管理</h2>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'status', label: '运行状态' },
          { key: 'backup', label: '备份/归档' },
          { key: 'danger', label: '危险操作' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Environment Status */}
      {activeTab === 'status' && (
        <div className="space-y-4 max-w-lg">
          {/* System info card */}
          {diagnostics?.system && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-800 mb-3">系统信息</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-400">操作系统</div>
                <div className="text-gray-700">{diagnostics.system.os}</div>
                <div className="text-gray-400">Python</div>
                <div className="text-gray-700">{diagnostics.system.python}</div>
                <div className="text-gray-400">主机名</div>
                <div className="text-gray-700">{diagnostics.system.hostname}</div>
                <div className="text-gray-400">IP 地址</div>
                <div className="text-gray-700">{diagnostics.system.ips?.join(', ') || '无'}</div>
                <div className="text-gray-400">部署方式</div>
                <div className="text-gray-700">{diagnostics.system.frozen ? '打包程序 (exe)' : '源码运行'}</div>
                <div className="text-gray-400">数据库</div>
                <div className="text-gray-700">
                  {diagnostics.system.db_exists
                    ? `${diagnostics.system.db_size_mb} MB`
                    : '未创建'}
                </div>
                <div className="text-gray-400">检测时间</div>
                <div className="text-gray-700">{diagnostics.system.time?.replace('T', ' ').substring(0, 19)}</div>
              </div>
            </div>
          )}

          {/* Summary bar */}
          {diagnostics?.summary && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm ${
              diagnostics.summary.healthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                diagnostics.summary.healthy ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
              }`}>
                {diagnostics.summary.healthy ? '✓' : '!'}
              </span>
              <div>
                <p className={`font-medium ${diagnostics.summary.healthy ? 'text-green-800' : 'text-red-800'}`}>
                  {diagnostics.summary.healthy ? '系统运行正常' : '存在异常项'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {diagnostics.summary.ok}项正常
                  {diagnostics.summary.warn > 0 && `, ${diagnostics.summary.warn}项警告`}
                  {diagnostics.summary.error > 0 && `, ${diagnostics.summary.error}项异常`}
                  {diagnostics.summary.repaired > 0 && `, ${diagnostics.summary.repaired}项已修复`}
                </p>
              </div>
            </div>
          )}

          {/* Detail check items */}
          {diagnostics?.items && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-800">详细检测项</h3>
                <button
                  onClick={runDiagnostics}
                  disabled={diagLoading}
                  className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50 transition-colors"
                >
                  {diagLoading ? '检测中...' : '重新检测'}
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {diagnostics.items.map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${statusColor(item.status)}`}>
                    {statusIcon(item.status)}
                    <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Backup/Archive */}
      {activeTab === 'backup' && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-800 mb-2">数据库备份</h3>
            <p className="text-xs text-gray-400 mb-3">将当前数据库文件复制到 backups 目录</p>
            <button onClick={handleBackup} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm transition-colors">立即备份</button>
            {backupMsg && <div className={`mt-2 text-xs ${backupMsg.includes('失败')?'text-red-500':'text-green-600'}`}>{backupMsg}</div>}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-800 mb-2">数据归档</h3>
            <p className="text-xs text-gray-400 mb-3">归档指定年份的记录（先备份再删除）</p>
            <div className="flex items-center gap-2">
              <input type="number" value={archiveYear} onChange={e=>setArchiveYear(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm w-32" placeholder="年份" />
              <button onClick={handleArchive} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-white text-sm transition-colors">归档</button>
            </div>
            {archiveMsg && <div className={`mt-2 text-xs ${archiveMsg.includes('失败')?'text-red-500':'text-green-600'}`}>{archiveMsg}</div>}
          </div>
        </div>
      )}

      {/* Tab: Danger */}
      {activeTab === 'danger' && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
            <h3 className="text-sm font-medium text-red-600 mb-2">删除历史数据</h3>
            <p className="text-xs text-gray-400 mb-3">删除指定日期之前的所有异常记录，不可恢复</p>
            <div className="flex items-center gap-2">
              <input type="date" value={deleteDate} onChange={e=>setDeleteDate(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm" />
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white text-sm transition-colors">删除</button>
            </div>
            {deleteMsg && <div className={`mt-2 text-xs ${deleteMsg.includes('失败')?'text-red-500':'text-green-600'}`}>{deleteMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
