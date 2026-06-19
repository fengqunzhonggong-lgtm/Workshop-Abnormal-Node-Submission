import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '../../api';

export default function FlowAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {}; if(dateFrom) params.date_from = dateFrom; if(dateTo) params.date_to = dateTo;
      const res = await api.get('/flow/analysis', { params });
      setData(res.data);
    } catch { }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  // Build heatmap data: [sourceIdx, foundIdx, count]
  const buildHeatmapData = () => {
    if (!data) return { heatData: [], sources: [], founds: [] };
    const sources = data.sourceNames;
    const founds = data.foundNames;
    const heatData = [];
    sources.forEach((s, si) => {
      founds.forEach((f, fi) => {
        const v = data.matrix[s]?.[f] || 0;
        if (v > 0) heatData.push([fi, si, v]);
      });
    });
    return { heatData, sources, founds };
  };

  const { heatData, sources, founds } = buildHeatmapData();

  const heatmapOption = {
    tooltip: {
      formatter: p => p.data
        ? `${founds[p.data[0]]} ← ${sources[p.data[1]]}<br/>数量: <b>${p.data[2]}</b>`
        : '',
    },
    grid: { left: 100, right: 40, top: 10, bottom: 80 },
    xAxis: {
      type: 'category', data: founds, position: 'bottom',
      axisLabel: { fontSize: 9, rotate: 35, color: '#6b7280' },
    },
    yAxis: {
      type: 'category', data: sources,
      axisLabel: { fontSize: 9, color: '#6b7280' },
    },
    visualMap: {
      min: 0, max: Math.max(...heatData.map(d => d[2]), 1),
      calculable: true, orient: 'horizontal', left: 'center', bottom: 5,
      inRange: { color: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1'] },
      textStyle: { fontSize: 9 },
    },
    series: [{
      type: 'heatmap', data: heatData,
      label: { show: true, fontSize: 9, color: '#374151' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  };

  // Sankey-like: bar chart of top flow pairs
  const topFlows = data?.rows?.slice(0, 10) || [];
  const flowBarOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 5, right: 10, top: 10, bottom: 5, containLabel: true },
    xAxis: { type: 'value', axisLabel: { fontSize: 9 } },
    yAxis: {
      type: 'category',
      data: topFlows.map(r => `${r.source_name} → ${r.found_name}`).reverse(),
      axisLabel: { fontSize: 8, color: '#6b7280' },
    },
    series: [{
      type: 'bar',
      data: topFlows.map(r => r.count).reverse(),
      itemStyle: {
        color: '#3b82f6', borderRadius: [0, 4, 4, 0],
      },
    }],
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-4">异常流向分析</h2>
      <p className="text-xs text-gray-400 mb-3">分析来源工序 → 发现工序的异常流向</p>
      <div className="flex items-center gap-2 mb-4">
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs" />
        <span className="text-gray-400 text-xs">至</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs" />
        <button onClick={fetchData} className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700">查询</button>
      </div>
      {loading ? <div className="text-center text-gray-400 py-12 text-sm">加载中...</div> : data ? (
        <div className="space-y-4">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <h4 className="text-xs text-gray-500 font-medium mb-2">流向热力图</h4>
              {heatData.length > 0
                ? <ReactECharts option={heatmapOption} style={{ height: Math.max(280, sources.length * 32 + 100) }} />
                : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <h4 className="text-xs text-gray-500 font-medium mb-2">流向 TOP10</h4>
              {topFlows.length > 0
                ? <ReactECharts option={flowBarOption} style={{ height: 280 }} />
                : <div className="text-center text-gray-300 py-16 text-xs">暂无数据</div>}
            </div>
          </div>

          {/* Cross table */}
          <div className="bg-white rounded-2xl overflow-x-auto shadow-sm border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">来源工序</th>
                  {data.foundNames.map(f=><th key={f} className="px-3 py-2 text-center font-medium">{f}</th>)}
                  <th className="px-3 py-2 text-center font-medium">合计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.sourceNames.map(s => {
                  const rowTotal = data.foundNames.reduce((sum,f)=>sum+(data.matrix[s]?.[f]||0),0);
                  return (
                    <tr key={s} className="hover:bg-gray-50 text-gray-700">
                      <td className="px-3 py-2 text-blue-600 font-medium">{s}</td>
                      {data.foundNames.map(f=><td key={f} className="px-3 py-2 text-center">{data.matrix[s]?.[f]?<span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{data.matrix[s][f]}</span>:<span className="text-gray-300">-</span>}</td>)}
                      <td className="px-3 py-2 text-center font-semibold text-gray-800">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.rows.length>0 && (
              <div className="p-4 border-t border-gray-100">
                <h4 className="text-xs text-gray-500 font-medium mb-2">流向明细 TOP10</h4>
                <div className="space-y-1">
                  {data.rows.slice(0,10).map((r,i)=><div key={i} className="flex justify-between items-center text-xs"><span className="text-gray-600">{r.source_name} → {r.found_name}</span><span className="text-blue-600 font-medium">{r.count} 次</span></div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      ):null}
    </div>
  );
}
