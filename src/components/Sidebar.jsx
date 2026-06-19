import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuConfig = {
  employee: [
    { path: '/', label: '异常填报', icon: '✏️' },
    { path: '/my-records', label: '我的记录', icon: '📋' },
  ],
  manager: [
    { path: '/', label: '异常填报', icon: '✏️' },
    { path: '/anomaly-query', label: '异常查询', icon: '🔍' },
    { path: '/export', label: 'Excel导出', icon: '📥' },
  ],
  superadmin: [
    { path: '/', label: '异常填报', icon: '✏️' },
    { path: '/anomaly-query', label: '异常查询', icon: '🔍' },
    { path: '/statistics', label: '统计分析', icon: '📊' },
    { path: '/flow-analysis', label: '流向分析', icon: '🔀' },
    { path: '/daily-report', label: '日报', icon: '📅' },
    { path: '/weekly-report', label: '周报', icon: '📆' },
    { path: '/monthly-report', label: '月报', icon: '🗓️' },
    { path: '/export', label: 'Excel导出', icon: '📥' },
    { path: '/base-data', label: '基础数据维护', icon: '⚙️' },
    { path: '/users', label: '用户管理', icon: '👥' },
    { path: '/system', label: '系统管理', icon: '🖥️' },
  ],
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = menuConfig[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = (r) =>
    ({ superadmin: '系统管理员', manager: '管理人员', employee: '员工' })[r] || r;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-[#0c1e45] z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-blue-900/50">
            <h2 className="text-white font-bold text-sm">总装异常管理系统</h2>
            <p className="text-blue-300 text-xs mt-1">{user?.name} ({user?.employee_id})</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-blue-700/50 text-blue-200">
              {roleLabel(user?.role)}
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto p-2">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-blue-900/50">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-blue-200/60 hover:bg-red-800/40 hover:text-red-300 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
