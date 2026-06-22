import React from 'react';
import { Ticket } from 'lucide-react';

export default function Header() {
  return (
    <header className="app-header">
      <div className="app-title-container">
        <span className="app-logo">
          <Ticket size={24} strokeWidth={3} />
        </span>
        <h1 className="app-title">小抽一番</h1>
      </div>
    </header>
  );
}
