import React from 'react';
import WordPressTroubleshooting from './components/WordPressTroubleshooting';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-container">
          <h1 className="app-title">🤖 Tettra Search Overhaul - Proof of Concept</h1>
          <p className="app-subtitle">AI-Powered WordPress Plugin Troubleshooting</p>
        </div>
      </nav>

      <main className="app-main">
        <WordPressTroubleshooting />
      </main>
    </div>
  );
};

export default App;