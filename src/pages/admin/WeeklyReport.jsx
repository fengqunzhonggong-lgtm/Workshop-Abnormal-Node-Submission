import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '../../api';

const barOption = (items) => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 10, top: 20, bottom: 5, containLabel: true },
  xAxis: { type: 'category', data: items.map(i=>i.name), axisLabel: { fontSize: 10, rotate: 20 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
  series: [{ type: 'bar', data: items.map(i=>i.count), itemStyle: { color: '#3b82f6', borderRadius: [4,4,0,0] } }],
});

// Parse "2026-W24" → {from: '2026-06-08', to: '2026-06-14'}
function weekRange(wk) {
  const m = wk.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = +m[1], wn = +m[2];
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek));
  const monday = new Date(firstMonday);
  monday.setDate(firstMonday.getDate() + (wn - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

export default function WeeklyReport() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const wn = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  const [week, setWeek] = useState(`${d.getFullYear()}-W${String(wn).padStart(2, '0')}`);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const range = weekRange(week);
      const params = {};
      if (range) { params.date_from = range.from; params.date_to = range.to; }
      const res = await api.get('/stats/summary', { params });
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [week]);

  const range = weekRange(week);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">周报</h2>
      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={week} onChange={e=>setWeek(e.target.value)} placeholder="2026-W24" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm w-32" />
        {range && <span className="text-xs text-gray-400">{range.from} ~ {range.to}</span>}
        <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 rounded-xl text-white text-sm hover:bg-blue-700">刷新</button>
      </div>
      {loading ? <div className="text-center text-gray-400 py-12 text-sm">加载中...</div> : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {[
              {label:'总异常数',value:data.total,cl:'border-l-blue-500'},
            ].map(c=>(
              <div key={c.label} className={`bg-white rounded-2xl p-3 border-l-4 ${c.cl} shadow-sm border border-gray-100`}>
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className="text-xl font-bold text-gray-800">{c.value}</div>
              </div>
            ))}
          </div>
          {data.total > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                <h4 className="text-xs text-gray-500 font-medium mb-2">按异常类别</h4>
                <ReactECharts option={barOption(data.byType)} style={{height:250}} />
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                <h4 className="text-xs text-gray-500 font-medium mb-2">按来源部门</h4>
                <ReactECharts option={barOption(data.byDept)} style={{height:250}} />
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8 text-sm bg-white rounded-2xl">本周暂无异常记录</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
