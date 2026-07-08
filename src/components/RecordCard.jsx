import React from 'react';
import { Calendar, Edit, Trash2, MapPin } from 'lucide-react';

export default function RecordCard({ record, onEdit, onDelete }) {
  const { id, date, location, cost, value, prizes } = record;
  const net = value - cost;

  // Split location into shop and series
  const getLocParts = () => {
    const loc = location || '';
    const splitIdx = loc.indexOf('《');
    if (splitIdx > -1) {
      return {
        shop: loc.substring(0, splitIdx).trim(),
        series: loc.substring(splitIdx).trim()
      };
    }
    return {
      shop: loc.trim() || '未命名店家',
      series: ''
    };
  };

  const { shop, series } = getLocParts();

  // Group prizes by tier + name for cleaner card display
  const getGroupedPrizes = () => {
    if (!prizes || !Array.isArray(prizes)) return [];
    const groups = {};
    prizes.forEach((p) => {
      const tier = (p.tier || '').toString();
      const name = (p.name || '').toString() || tier || '炮灰';
      const count = p.count || 1;
      const key = `${tier}||${name}`;
      if (!groups[key]) groups[key] = { tier, name, count: 0 };
      groups[key].count += count;
    });
    return Object.values(groups);
  };

  const groupedPrizes = getGroupedPrizes();

  // Decide badge styling based on prize name
  const isHighPrize = (name) => {
    const upperName = name.toUpperCase();
    return (
      upperName.startsWith('S賞') ||
      upperName.startsWith('A賞') ||
      upperName.includes('LAST') ||
      upperName.includes('SP賞') ||
      upperName.includes('最後') ||
      upperName.startsWith('B賞')
    );
  };

  const formatCurrency = (val) => {
    return `NT$ ${Math.abs(val).toLocaleString()}`;
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(record);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除這筆戰績嗎？')) {
      onDelete(id);
    }
  };

  return (
    <div className="record-card animate-fade">
      <div className="record-card-header">
        <div className="record-card-title-group">
          <div className="record-card-shop" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '3px' }}>
            {shop}
          </div>
          <span className="record-card-date" style={{ display: 'inline-flex', marginBottom: '6px' }}>
            <Calendar size={12} />
            {date}
          </span>
          <h3 className="record-card-title" style={{ marginTop: '2px' }}>
            {series || '未命名套組'}
          </h3>
        </div>
        
        <div className="record-card-actions">
          <button className="text-btn edit" onClick={handleEdit} title="編輯">
            <Edit size={14} />
            <span>編輯</span>
          </button>
          <button className="text-btn delete" onClick={handleDelete} title="刪除">
            <Trash2 size={14} />
            <span>刪除</span>
          </button>
        </div>
      </div>

      {groupedPrizes.length > 0 ? (
        <div className="record-prizes-container">
          {groupedPrizes.map((prize, idx) => (
            <span
              key={idx}
              className={`record-prize-tag ${isHighPrize(prize.tier || prize.name) ? 'A' : 'normal'}`}
              title={prize.name}
            >
              {prize.tier ? `${prize.tier} · ${prize.name}` : prize.name} {prize.count > 1 ? `x${prize.count}` : ''}
            </span>
          ))}
        </div>
      ) : (
        <div className="record-prizes-container">
          <span className="record-prize-tag normal">無記錄獎項</span>
        </div>
      )}

      <div className="record-card-footer">
        <div className="record-card-stats">
          <div className="card-stat-group">
            <span className="card-stat-label">花費</span>
            <span className="card-stat-val" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(cost)}
            </span>
          </div>
          <div className="card-stat-group">
            <span className="card-stat-label">價值</span>
            <span className="card-stat-val" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(value)}
            </span>
          </div>
        </div>

        <span className={`record-net-badge ${net >= 0 ? 'win' : 'loss'}`}>
          {net >= 0 ? '贏' : '虧'} {formatCurrency(net)}
        </span>
      </div>
    </div>
  );
}
