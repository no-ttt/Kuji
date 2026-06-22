import React, { useState, useEffect } from 'react';
import { X, Save, HelpCircle } from 'lucide-react';

const PRESET_PRIZES = [
  'A賞', 'B賞', 'C賞', 'D賞', 'E賞', 'F賞', 'G賞', 'H賞', 'I賞', 'J賞', 'K賞',
  'LastOne賞', '炮灰'
];

export default function RecordForm({ isOpen, onClose, onSave, editingRecord }) {
  const getLocalDateString = () => {
    const local = new Date();
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getLocalDateString());
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('');
  const [drawCount, setDrawCount] = useState(1);
  const [prizes, setPrizes] = useState([{ name: '', value: '' }]);

  // Sync state with editingRecord
  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.date);
      setLocation(editingRecord.location);
      setCost(editingRecord.cost.toString());
      
      let loadedPrizes = [];
      if (editingRecord.prizes && Array.isArray(editingRecord.prizes)) {
        const hasCount = editingRecord.prizes.some(p => 'count' in p);
        if (hasCount) {
          const totalCount = editingRecord.prizes.reduce((sum, p) => sum + (p.count || 1), 0);
          const valPerDraw = totalCount > 0 ? Math.round(editingRecord.value / totalCount) : 0;
          editingRecord.prizes.forEach(p => {
            const count = p.count || 1;
            for (let i = 0; i < count; i++) {
              loadedPrizes.push({ name: p.name, value: valPerDraw.toString() });
            }
          });
        } else {
          loadedPrizes = editingRecord.prizes.map(p => ({
            name: p.name || '',
            value: p.value !== undefined ? p.value.toString() : ''
          }));
        }
      }
      
      if (loadedPrizes.length === 0) {
        loadedPrizes = [{ name: '', value: '' }];
      }
      
      setPrizes(loadedPrizes);
      setDrawCount(loadedPrizes.length);
    } else {
      setDate(getLocalDateString());
      setLocation('');
      setCost('');
      setDrawCount(1);
      setPrizes([{ name: '', value: '' }]);
    }
  }, [editingRecord, isOpen]);

  if (!isOpen) return null;

  const handleDrawCountChange = (val) => {
    const countText = val.replace(/\D/g, '');
    const count = parseInt(countText) || 0;
    setDrawCount(count);
    
    const activeCount = Math.max(1, count);
    setPrizes((prev) => {
      if (prev.length < activeCount) {
        const diff = activeCount - prev.length;
        const extra = Array(diff).fill(null).map(() => ({ name: '', value: '' }));
        return [...prev, ...extra];
      } else {
        return prev.slice(0, activeCount);
      }
    });
  };

  const updatePrize = (index, field, val) => {
    setPrizes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: val
      };
      return updated;
    });
  };

  const handleSelectChange = (index, val) => {
    setPrizes((prev) => {
      const updated = [...prev];
      const prevPrize = updated[index] || { name: '', value: '' };
      
      let newName = val;
      let newValue = prevPrize.value;

      if (val === 'other') {
        newName = '其他獎項';
      } else if (val === '炮灰') {
        newValue = '0';
      }

      updated[index] = {
        name: newName,
        value: newValue
      };
      return updated;
    });
  };

  // Compute total value based on individual prize values
  const computedTotalValue = prizes.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!location.trim()) {
      alert('請輸入抽了什麼與在哪抽！');
      return;
    }
    if (cost === '' || isNaN(cost) || Number(cost) < 0) {
      alert('請輸入有效的花費金額！');
      return;
    }

    const finalDrawCount = Math.max(1, drawCount);
    // Sanitize prizes - default empty names to '炮灰' and values to 0
    const sanitizedPrizes = prizes.slice(0, finalDrawCount).map((p, idx) => ({
      name: p.name.trim() || '炮灰',
      value: Number(p.value) || 0
    }));

    const totalValue = sanitizedPrizes.reduce((sum, p) => sum + p.value, 0);

    const recordData = {
      id: editingRecord ? editingRecord.id : Date.now().toString(),
      date,
      location: location.trim(),
      cost: Number(cost),
      value: totalValue,
      prizes: sanitizedPrizes
    };

    onSave(recordData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editingRecord ? '修改戰績' : '新增戰績'}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="animate-fade">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Date Picker */}
            <div className="form-group">
              <label className="form-label">抽獎日期</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>

            {/* Location & Set */}
            <div className="form-group">
              <label className="form-label">在哪抽了什麼 (店家/套組名稱)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="例如: 7-11 忠孝店 - 寶可夢"
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                required 
              />
            </div>

            {/* Cost and Draw Count Row */}
            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">花費金額 (NT$)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="總花費"
                  value={cost} 
                  onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">抽數 (幾抽)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="抽數"
                  value={drawCount || ''} 
                  onChange={(e) => handleDrawCountChange(e.target.value)}
                  onBlur={() => {
                    if (!drawCount || drawCount < 1) {
                      handleDrawCountChange('1');
                    }
                  }}
                  required 
                />
              </div>
            </div>

            {/* Dynamic Draws List */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label">抽中獎項明細</label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <HelpCircle size={12} /> 炮灰將自動填入 0 元價值
                </span>
              </div>

              <div className="draws-container">
                {Array(Math.max(1, drawCount)).fill(null).map((_, idx) => {
                  const prize = prizes[idx] || { name: '', value: '' };
                  const isPreset = PRESET_PRIZES.includes(prize.name) || prize.name === '';
                  const selectValue = prize.name === '' ? '' : (isPreset ? prize.name : 'other');

                  return (
                    <div className="draw-row" key={idx}>
                      <span className="draw-row-number">#{idx + 1}</span>
                      <div className="draw-row-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                          <select
                            className="form-input"
                            value={selectValue}
                            onChange={(e) => handleSelectChange(idx, e.target.value)}
                            style={{ 
                              backgroundColor: 'var(--bg-primary)', 
                              border: '2px solid var(--border-color)', 
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">選擇獎項...</option>
                            {PRESET_PRIZES.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                            <option value="other">其他 (手動輸入)</option>
                          </select>
                          
                          <input 
                            type="text" 
                            className="form-input val-input" 
                            placeholder="價值 NT$" 
                            value={prize.value} 
                            onChange={(e) => updatePrize(idx, 'value', e.target.value.replace(/[^0-9]/g, ''))}
                          />
                        </div>
                        
                        {!isPreset && (
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="請輸入自訂獎項名稱..." 
                            value={prize.name} 
                            onChange={(e) => updatePrize(idx, 'name', e.target.value)}
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculated Total Value Box */}
            <div className="total-value-indicator animate-fade">
              <span>戰利品總估計價值</span>
              <span>NT$ {computedTotalValue.toLocaleString()}</span>
            </div>

            {/* Submit Button */}
            <div className="form-actions" style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={18} />
                儲存戰績
              </button>
            </div>
            
          </div>
        </form>
      </div>
    </div>
  );
}
