import { Link } from 'react-router-dom';

interface AppHeaderProps {}

export const AppHeader: React.FC<AppHeaderProps> = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <nav className="header-nav-links header-nav-open">
          <Link to="/examples" className="header-nav-link">Examples</Link>
        </nav>
      </div>
    </header>
  );
};
