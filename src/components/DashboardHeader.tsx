interface DashboardHeaderProps {
  userId: string;
  onToggleLegacyTester: () => void;
  showLegacyTester: boolean;
}

export default function DashboardHeader({ userId, onToggleLegacyTester, showLegacyTester }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <h1>🎓 Convex Autograding</h1>
          <p>Automated grading for Google Classroom assignments</p>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-email">{userId}</span>
            <div className="user-status">
              <span className="status-indicator online"></span>
              <span>Online</span>
            </div>
          </div>

          <button
            onClick={onToggleLegacyTester}
            className="legacy-toggle-btn"
            title="Toggle legacy API tester"
          >
            {showLegacyTester ? '🔧' : '⚙️'} Dev Tools
          </button>
        </div>
      </div>
    </header>
  );
}