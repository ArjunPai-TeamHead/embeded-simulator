import { useLocation } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { ShareModal } from './ShareModal';
import { useState } from 'react';

interface AppHeaderProps {}

export const AppHeader: React.FC<AppHeaderProps> = () => {
  const location = useLocation();
  const currentProject = useProjectStore((s) => s.currentProject);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="14" height="14" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
            </svg>
            <span className="header-title">Embedded Simulator</span>
          </div>
        </div>

        <div className="header-right">
          {currentProject && location.pathname === '/' && (
            <button
              onClick={() => setShowShareModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid #555',
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#ccc',
                fontSize: 13,
              }}
              title="Share project"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>

      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
    </header>
  );
};
