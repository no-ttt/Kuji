import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Banner from './components/Banner';
import RecordCard from './components/RecordCard';
import RecordForm from './components/RecordForm';
import StatsView from './components/StatsView';
import { Plus, List, BarChart2, Search, RefreshCw } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  // If Supabase failed to initialize, render warning screen immediately
  if (!supabase) {
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
        backgroundColor: 'var(--bg-primary)'
      }}>
        <h3 style={{ color: 'var(--color-danger)', marginBottom: '16px', fontSize: '1.3rem' }}>設定錯誤 ⚠️</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.8', maxWidth: '340px' }}>
          偵測到 <code>.env</code> 設定未生效或檔案不存在。<br /><br />
          請確認您的專案目錄下已建立 <code>.env</code> 檔案並填入以下變數：<br /><br />
          <span style={{ display: 'block', textAlign: 'left', backgroundColor: '#F1EFE9', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontFamily: 'monospace' }}>
            VITE_SUPABASE_URL=您的網址<br />
            VITE_SUPABASE_ANON_KEY=您的Anon公鑰
          </span>
          <br />
          設定後請重新執行 <code>npm run deploy</code> 進行部署。
        </p>
      </div>
    );
  }

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'stats'
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Fetch records from Supabase on mount
  useEffect(() => {
    const loadRecords = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('kuji_records')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        if (data) {
          setRecords(data);
        }
      } catch (err) {
        console.error('Failed fetching from Supabase:', err);
        alert('讀取雲端資料失敗：' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, []);

  const handleSaveRecord = async (recordData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('kuji_records')
        .upsert(recordData);

      if (error) throw error;

      setRecords((prev) => {
        const index = prev.findIndex((r) => r.id === recordData.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = recordData;
          return updated;
        } else {
          return [recordData, ...prev];
        }
      });
    } catch (err) {
      alert('雲端儲存失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('kuji_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('雲端刪除失敗：' + err.message);
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
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={16} className="animate-flash" style={{ animationDuration: '1s' }} />
                <span>資料同步中...</span>
              </div>
            )}
            
            {!isLoading && filteredRecords.length > 0 ? (
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
      />
    </>
  );
}
