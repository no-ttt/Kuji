import React from 'react';
import { Award, BarChart2, TrendingUp, DollarSign } from 'lucide-react';

export default function StatsView({ records }) {
  if (!records || records.length === 0) {
    return (
      <div className="empty-state animate-fade">
        <BarChart2 className="empty-state-icon" size={48} />
        <p>目前尚無戰績資料，請先新增資料以產生統計圖表。</p>
      </div>
    );
  }

  // General Metrics
  const totalSessions = records.length;
  const profitableSessions = records.filter(r => r.value > r.cost).length;
  const winRate = ((profitableSessions / totalSessions) * 100).toFixed(0);

  const totalSpent = records.reduce((sum, r) => sum + r.cost, 0);
  const avgSpent = (totalSpent / totalSessions).toFixed(0);

  const sessionNetList = records.map(r => ({
    net: r.value - r.cost,
    location: r.location
  }));

  const bestSession = sessionNetList.reduce(
    (best, curr) => (curr.net > best.net ? curr : best),
    { net: -Infinity, location: '無' }
  );

  const worstSession = sessionNetList.reduce(
    (worst, curr) => (curr.net < worst.net ? curr : worst),
    { net: Infinity, location: '無' }
  );

  const formatCurrency = (val) => {
    return `NT$ ${Math.round(Math.abs(val)).toLocaleString()}`;
  };

  // 1. Prize Distribution (Top 5)
  const prizeCounts = {};
  records.forEach(r => {
    if (r.prizes && Array.isArray(r.prizes)) {
      r.prizes.forEach(p => {
        const name = p.name.trim();
        prizeCounts[name] = (prizeCounts[name] || 0) + (p.count || 1);
      });
    }
  });

  const sortedPrizes = Object.entries(prizeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxPrizeCount = sortedPrizes.length > 0 ? sortedPrizes[0].count : 1;

  // 2. Monthly Spending (Last 6 distinct months)
  const monthlyData = {};
  records.forEach(r => {
    // Expecting YYYY-MM-DD
    const month = r.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyData[month]) {
      monthlyData[month] = { cost: 0, value: 0 };
    }
    monthlyData[month].cost += r.cost;
    monthlyData[month].value += r.value;
  });

  const sortedMonths = Object.entries(monthlyData)
    .map(([month, data]) => {
      const [year, m] = month.split('-');
      return {
        key: month,
        label: `${parseInt(m)}月`,
        cost: data.cost,
        value: data.value
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6); // Only last 6 months

  const maxMonthlySpent = sortedMonths.length > 0 
    ? Math.max(...sortedMonths.map(m => m.cost), 100) 
    : 100;

  // Decide if a prize is high-tier for gold styling in chart
  const isHighPrize = (name) => {
    const upperName = name.toUpperCase();
    return (
      upperName.startsWith('A賞') ||
      upperName.includes('LAST') ||
      upperName.includes('SP賞') ||
      upperName.includes('最後') ||
      upperName.startsWith('B賞')
    );
  };

  return (
    <div className="stats-view-container animate-fade">
      
      {/* General Metrics Card */}
      <div className="stats-card">
        <h4 className="stats-card-title">戰績指標</h4>
        
        <div className="stat-metric-row">
          <div className="metric-box">
            <div className="metric-box-val" style={{ color: 'var(--color-success)' }}>
              {winRate}%
            </div>
            <div className="metric-box-label">獲利抽數比例</div>
          </div>
          <div className="metric-box">
            <div className="metric-box-val">
              {formatCurrency(avgSpent)}
            </div>
            <div className="metric-box-label">平均單次花費</div>
          </div>
        </div>

        <div className="stat-metric-row" style={{ marginTop: '8px' }}>
          <div className="metric-box">
            <div className="metric-box-val" style={{ color: 'var(--color-gold)', fontSize: '1rem' }}>
              {bestSession.net > -Infinity ? formatCurrency(bestSession.net) : 'NT$ 0'}
            </div>
            <div className="metric-box-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              最高獲利: {bestSession.location}
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-box-val" style={{ color: 'var(--color-danger)', fontSize: '1rem' }}>
              {worstSession.net < Infinity ? formatCurrency(worstSession.net) : 'NT$ 0'}
            </div>
            <div className="metric-box-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              最大虧損: {worstSession.location}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Spending Trend */}
      <div className="stats-card">
        <h4 className="stats-card-title">每月花費趨勢</h4>
        {sortedMonths.length > 0 ? (
          <div className="monthly-chart-container">
            {sortedMonths.map((m) => {
              const heightPercent = (m.cost / maxMonthlySpent) * 100;
              return (
                <div key={m.key} className="monthly-bar-col">
                  <div className="monthly-bar-tooltip">
                    花費: {formatCurrency(m.cost)}
                  </div>
                  <div className="monthly-bar-wrapper">
                    <div 
                      className="monthly-bar-fill" 
                      style={{ height: `${Math.max(8, heightPercent)}%` }} 
                    />
                  </div>
                  <span className="monthly-bar-label">{m.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            暫無月份資料
          </div>
        )}
      </div>

      {/* Top Prizes Distribution */}
      <div className="stats-card">
        <h4 className="stats-card-title">抽中獎項排行 (Top 5)</h4>
        {sortedPrizes.length > 0 ? (
          <div className="prize-chart-container">
            {sortedPrizes.map((p, idx) => {
              const widthPercent = (p.count / maxPrizeCount) * 100;
              return (
                <div key={idx} className="chart-bar-row">
                  <span className="chart-bar-label" title={p.name}>
                    {p.name}
                  </span>
                  <div className="chart-bar-wrapper">
                    <div 
                      className={`chart-bar-fill ${isHighPrize(p.name) ? 'gold' : ''}`}
                      style={{ width: `${widthPercent}%` }} 
                    />
                  </div>
                  <span className="chart-bar-val">{p.count}次</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            尚未登錄任何獎項
          </div>
        )}
      </div>

    </div>
  );
}
