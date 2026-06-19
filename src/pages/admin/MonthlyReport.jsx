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

const pieOption = (items) => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: { color: '#6b7280', fontSize: 10 } },
  series: [{ type: 'pie', radius: ['40%','70%'], center: ['50%','45%'], data: items.map(i=>({name:i.name,value:i.count})), label: { fontSize: 10, color: '#6b7280' } }],
});

export default function MonthlyReport() {
  const d = new Date();
  const thisMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [y, m] = month.split('-');
      const year = +y, mon = +m;
      const lastDay = new Date(year, mon, 0).getDate(); // mon is 1-indexed → JS month, day 0 = last day
      const from = `${y}-${String(mon).padStart(2,'0')}-01`;
      const to = `${y}-${String(mon).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
      const res = await api.get('/stats/summary', { params: { date_from: from, date_to: to } });
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [month]);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">月报</h2>
      <div className="flex items-center gap-2 mb-4">
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm" />
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
                <ReactECharts option={pieOption(data.byDept)} style={{height:250}} />
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8 text-sm bg-white rounded-2xl">本月暂无异常记录</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
