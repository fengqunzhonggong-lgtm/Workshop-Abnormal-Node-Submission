import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId.trim() || !password.trim()) {
      setError('请输入工号和密码');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(employeeId.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">总装车间异常管理系统</h1>
          <p className="text-gray-500 mt-1 text-sm">请使用工号登录</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">工号</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="请输入工号"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-white font-medium text-sm transition-colors shadow-sm"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">车间局域网访问 · 版本 1.0</p>
      </div>
    </div>
  );
}
