import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Banner({ records }) {
  // Calculate stats
  const totalCost = records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const totalValue = records.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const netProfit = totalValue - totalCost;

  // Calculate total draw count (prizes count)
  const totalDraws = records.reduce((sum, r) => {
    if (r.prizes && Array.isArray(r.prizes)) {
      return sum + r.prizes.reduce((pSum, p) => pSum + (Number(p.count) || 1), 0);
    }
    return sum + 1; // Default fallback to 1 if no detailed prizes
  }, 0);

  let statusClass = 'neutral';
  let StatusIcon = Minus;
  let statusText = '打平';

  if (netProfit > 0) {
    statusClass = 'win';
    StatusIcon = TrendingUp;
    statusText = '獲利';
  } else if (netProfit < 0) {
    statusClass = 'loss';
    StatusIcon = TrendingDown;
    statusText = '虧損';
  }

  const formatCurrency = (val) => {
    return `NT$ ${Math.abs(val).toLocaleString()}`;
  };

  return (
    <div className="banner-container animate-scale">
      <div className={`stats-banner ${statusClass}`}>
        <div className="banner-glow" />

        <div className="banner-main-stat">
          <span className="banner-label">目前戰績 ({statusText})</span>
          <h2 className="banner-net-profit">
            <StatusIcon size={28} />
            {netProfit > 0 && '+'}
            {netProfit < 0 && '-'}
            {formatCurrency(netProfit)}
          </h2>
        </div>

        <div className="banner-substats">
          <div className="substat-item">
            <span className="substat-label">累計花費</span>
            <span className="substat-value">{formatCurrency(totalCost)}</span>
          </div>

          <div className="substat-item">
            <span className="substat-label">估計價值</span>
            <span className="substat-value">{formatCurrency(totalValue)}</span>
          </div>

          <div className="substat-item">
            <span className="substat-label">累計抽數</span>
            <span className="substat-value">{totalDraws} 抽</span>
          </div>
        </div>
      </div>
    </div>
  );
}
