import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Banner from './components/Banner';
import RecordCard from './components/RecordCard';
import RecordForm from './components/RecordForm';
import StatsView from './components/StatsView';
import { Plus, List, BarChart2, Search, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;

export default function App() {
  // Render configuration guide if Google Sheets URL is missing
  if (!API_URL) {
    return (
      <div style={{
        padding: '80px 20px 40px 20px',
        textAlign: 'center',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: 'var(--font-sans)'
      }}>
        <h3 style={{ color: 'var(--color-danger)', marginBottom: '16px', fontSize: '1.3rem' }}>設定未完成 ⚠️</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.8', maxWidth: '340px' }}>
          偵測到 <code>.env</code> 檔案中未設定 <code>VITE_GOOGLE_SHEETS_URL</code> 變數。<br /><br />
          請確認您的專案目錄下已建立 <code>.env</code> 檔案並填入您的 Google Apps Script 網址：<br /><br />
          <span style={{ display: 'block', textAlign: 'left', backgroundColor: '#F1EFE9', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            VITE_GOOGLE_SHEETS_URL=您的 Apps Script 部署網址
          </span>
          <br />
          設定後請重新執行您的部署。
        </p>
      </div>
    );
  }

  // Initialize records state from localStorage for instantaneous 0ms loading (SWR)
  const [records, setRecords] = useState(() => {
    try {
      const cached = localStorage.getItem('kuji_records');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'stats'
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Fetch records from Google Sheets on mount (background sync)
  useEffect(() => {
    const loadRecords = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setRecords(data);
          localStorage.setItem('kuji_records', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed fetching from Google Sheets:', err);
        // Only trigger an alert if the user has absolutely no cached data to view
        const cached = localStorage.getItem('kuji_records');
        if (!cached) {
          alert('讀取 Google 試算表失敗：' + err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, []);

  const handleSaveRecord = async (recordData) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain' // Use text/plain to bypass CORS preflight in Apps Script
        },
        body: JSON.stringify({ action: 'save', record: recordData })
      });
      const result = await response.json();
      if (result.success) {
        setRecords((prev) => {
          const index = prev.findIndex((r) => r.id === recordData.id);
          let updated;
          if (index > -1) {
            updated = [...prev];
            updated[index] = recordData;
          } else {
            updated = [recordData, ...prev];
          }
          localStorage.setItem('kuji_records', JSON.stringify(updated));
          return updated;
        });
      } else {
        throw new Error(result.error || '伺服器寫入失敗');
      }
    } catch (err) {
      alert('儲存至 Google 試算表失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain' // Use text/plain to bypass CORS preflight in Apps Script
        },
        body: JSON.stringify({ action: 'delete', id: id })
      });
      const result = await response.json();
      if (result.success) {
        setRecords((prev) => {
          const updated = prev.filter((r) => r.id !== id);
          localStorage.setItem('kuji_records', JSON.stringify(updated));
          return updated;
        });
      } else {
        throw new Error(result.error || '伺服器刪除失敗');
      }
    } catch (err) {
      alert('刪除資料失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const openEditForm = (record) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  // Filter logic
  const filteredRecords = records.filter((r) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const matchLocation = r.location.toLowerCase().includes(query);
    const matchPrizes = r.prizes && r.prizes.some((p) => p.name.toLowerCase().includes(query));

    return matchLocation || matchPrizes;
  });

  return (
    <>
      <Header />

      <Banner records={records} />

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <List size={16} />
          戰績清單
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart2 size={16} />
          數據分析
        </button>
      </div>

      {/* Main View Content */}
      {activeTab === 'list' ? (
        <>
          {/* Search bar */}
          <div className="filter-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="搜尋抽了什麼、在哪抽..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Records list */}
          <div className="record-list-container">
            {/* Background syncing status indicator */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <RefreshCw size={14} className="animate-flash" style={{ animationDuration: '1s' }} />
                <span>資料同步中...</span>
              </div>
            )}

            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onEdit={openEditForm}
                  onDelete={handleDeleteRecord}
                />
              ))
            ) : (
              !isLoading && (
                <div className="empty-state animate-fade">
                  <Search className="empty-state-icon" size={48} />
                  <p>{searchQuery ? '找不到相符的戰績記錄' : '目前尚無紀錄，點選右下角 + 新增吧！'}</p>
                </div>
              )
            )}
          </div>

          {/* Floating Action Button for mobile add */}
          <button
            className="fab-btn"
            onClick={openAddForm}
            title="新增戰績"
            aria-label="Add record"
          >
            <Plus size={28} />
          </button>
        </>
      ) : (
        <StatsView records={records} />
      )}

      {/* Form Bottom Sheet Modal */}
      <RecordForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        isLoading={isLoading}
      />
    </>
  );
}
