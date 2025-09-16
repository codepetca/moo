interface DashboardSummary {
  totalClassrooms: number;
  totalAssignments: number;
  totalSubmissions: number;
  recentClassrooms?: Array<{
    _id: string;
    courseName: string;
    lastSyncTime: number;
  }>;
  recentAssignments?: Array<{
    _id: string;
    title: string;
    lastSyncTime: number;
  }>;
}

interface DashboardStatsProps {
  summary?: DashboardSummary;
}

export default function DashboardStats({ summary }: DashboardStatsProps) {
  if (!summary) {
    return (
      <div className="dashboard-stats loading">
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card skeleton">
              <div className="stat-value skeleton-text"></div>
              <div className="stat-label skeleton-text"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Active Classrooms",
      value: summary.totalClassrooms,
      icon: "🏫",
      color: "blue"
    },
    {
      label: "Configured Assignments",
      value: summary.totalAssignments,
      icon: "📝",
      color: "green"
    },
    {
      label: "Total Submissions",
      value: summary.totalSubmissions,
      icon: "📊",
      color: "purple"
    },
    {
      label: "Auto-graded Today",
      value: 0, // TODO: Add this to summary
      icon: "⚡",
      color: "orange"
    }
  ];

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-content">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-details">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(summary.recentClassrooms?.length > 0 || summary.recentAssignments?.length > 0) && (
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-grid">
            {summary.recentClassrooms?.length > 0 && (
              <div className="activity-section">
                <h4>Recently Synced Classrooms</h4>
                <ul>
                  {summary.recentClassrooms.slice(0, 3).map((classroom) => (
                    <li key={classroom._id}>
                      <span className="activity-name">{classroom.courseName}</span>
                      <span className="activity-time">
                        {new Date(classroom.lastSyncTime).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.recentAssignments?.length > 0 && (
              <div className="activity-section">
                <h4>Recent Assignments</h4>
                <ul>
                  {summary.recentAssignments.slice(0, 3).map((assignment) => (
                    <li key={assignment._id}>
                      <span className="activity-name">{assignment.title}</span>
                      <span className="activity-time">
                        {new Date(assignment.lastSyncTime).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}