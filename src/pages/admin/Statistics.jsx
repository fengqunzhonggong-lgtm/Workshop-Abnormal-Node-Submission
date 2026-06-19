import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '../../api';

export default function Statistics() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deptId, setDeptId] = useState('');
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/base-data/source_departments').then(res => {
      setDepartments(res.data.filter(d => d.is_active));
    }).catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (deptId) params.source_department_id = deptId;
      const [summaryRes, trendRes] = await Promise.all([
        api.get('/stats/summary', { params }),
        api.get('/stats/trend', { params: { days: dateFrom ? 365 : 30 } }),
      ]);
      setData(summaryRes.data); setTrend(trendRes.data);
    } catch { }
    setLoading(false);
  }, [dateFrom, dateTo, deptId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const setQuickRange = (type) => {
    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10);
    if (type === 'today') { setDateFrom(fmt(today)); setDateTo(fmt(today)); }
    else if (type === 'week') { const s = new Date(today); s.setDate(today.getDate()-today.getDay()+1); setDateFrom(fmt(s)); setDateTo(fmt(today)); }
    else if (type === 'month') { setDateFrom(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`); setDateTo(fmt(today)); }
    else if (type === 'year') { setDateFrom(`${today.getFullYear()}-01-01`); setDateTo(fmt(today)); }
  };

  const barOption = (items, nameKey='name', valKey='count') => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 10, right: 10, top: 20, bottom: 5, containLabel: true },
    xAxis: { type: 'category', data: items.map(i=>i[nameKey]), axisLabel: { fontSize: 10, rotate: 25 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{ type: 'bar', data: items.map(i=>i[valKey]), itemStyle: { color: '#3b82f6', borderRadius: [4,4,0,0] } }],
  });

  const pieOption = (items, nameKey='name', valKey='count') => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#6b7280', fontSize: 10 } },
    series: [{ type: 'pie', radius: ['40%','70%'], center: ['50%','45%'], data: items.map(i=>({name:i[nameKey],value:i[valKey]})), label: { fontSize: 10, color: '#6b7280' } }],
  });

  const trendOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 5, right: 10, top: 10, bottom: 5, containLabel: true },
    xAxis: { type: 'category', data: trend.map(t=>t.date), axisLabel: { fontSize: 9, rotate: 25 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{ type: 'line', data: trend.map(t=>t.count), smooth: true, lineStyle: { color: '#22c55e' }, itemStyle: { color: '#22c55e' }, areaStyle: { color: 'rgba(34,197,94,0.1)' } }],
  };

  const selectedDept = departments.find(d => String(d.id) === deptId);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">统计分析{selectedDept ? ` - ${selectedDept.name}` : '（全部）'}</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {[{label:'今天',v:'today'},{label:'本周',v:'week'},{label:'本月',v:'month'},{label:'今年',v:'year'}].map(f => (
          <button key={f.v} onClick={()=>setQuickRange(f.v)} className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">{f.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={deptId} onChange={e => setDeptId(e.target.value)} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs">
          <option value="">全部部门</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs" />
        <span className="text-gray-400 text-xs">至</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs" />
        <button onClick={fetchStats} className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700">查询</button>
      </div>

      {loading ? <div className="text-center text-gray-400 py-12 text-sm">加载中...</div> : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'总异常数', value:data.total, color:'border-l-blue-500', bg:'bg-blue-50' },
              { label:'待处理', value:data.open, color:'border-l-yellow-500', bg:'bg-yellow-50' },
              { label:'已解决', value:data.resolved, color:'border-l-green-500', bg:'bg-green-50' },
              { label:'处理率', value:data.total?Math.round(data.resolved/data.total*100)+'%':'-', color:'border-l-purple-500', bg:'bg-purple-50' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-3 border-l-4 ${c.color} shadow-sm border border-gray-100`}>
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className="text-xl font-bold text-gray-800">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <h4 className="text-xs text-gray-500 font-medium mb-2">异常类别分布</h4>
              {data.byType.length > 0
                ? <ReactECharts option={barOption(data.byType)} style={{ height: 250 }} />
                : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <h4 className="text-xs text-gray-500 font-medium mb-2">来源部门分布</h4>
              {data.byDept.length > 0
                ? <ReactECharts option={pieOption(data.byDept)} style={{ height: 250 }} />
                : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <h4 className="text-xs text-gray-500 font-medium mb-2">来源工序分布</h4>
              {data.bySourceProcess.length > 0
                ? <ReactECharts option={barOption(data.bySourceProcess)} style={{ height: 250 }} />
                : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <h4 className="text-xs text-gray-500 font-medium mb-2">发现工序分布</h4>
              {data.byFoundProcess.length > 0
                ? <ReactECharts option={barOption(data.byFoundProcess)} style={{ height: 250 }} />
                : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
            <h4 className="text-xs text-gray-500 font-medium mb-2">每日趋势</h4>
            {trend.length > 0
              ? <ReactECharts option={trendOption} style={{ height: 250 }} />
              : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
