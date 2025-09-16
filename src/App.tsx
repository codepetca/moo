import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { faker } from "@faker-js/faker";
import ClassroomList from "./components/ClassroomList";
import AssignmentPanel from "./components/AssignmentPanel";
import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";

// For demo purposes. In a real app, you'd have real user authentication.
const USER_ID = getOrSetUserId();

export default function App() {
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [showLegacyTester, setShowLegacyTester] = useState(false);

  // Get dashboard data
  const dashboardSummary = useQuery(api.autograding.getDashboardSummary, { userId: USER_ID });
  const classrooms = useQuery(api.autograding.getClassrooms, { userId: USER_ID });

  // Legacy chat data (keeping for compatibility during transition)
  const messages = useQuery(api.chat.getMessages);

  return (
    <div className="dashboard">
      <DashboardHeader
        userId={USER_ID}
        onToggleLegacyTester={() => setShowLegacyTester(!showLegacyTester)}
        showLegacyTester={showLegacyTester}
      />

      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Dashboard Stats Overview */}
          <DashboardStats summary={dashboardSummary} />

          {/* Main Dashboard Content */}
          <div className="dashboard-content">
            {/* Left Sidebar - Classrooms */}
            <aside className="dashboard-sidebar">
              <ClassroomList
                classrooms={classrooms || []}
                selectedClassroomId={selectedClassroomId}
                onSelectClassroom={setSelectedClassroomId}
                userId={USER_ID}
              />
            </aside>

            {/* Main Content - Assignments and Configuration */}
            <section className="dashboard-assignments">
              {selectedClassroomId ? (
                <AssignmentPanel
                  classroomId={selectedClassroomId}
                  userId={USER_ID}
                />
              ) : (
                <div className="no-selection">
                  <div className="no-selection-content">
                    <h2>🎓 Welcome to Convex Autograding</h2>
                    <p>Select a classroom from the left to view and manage assignments.</p>
                    <div className="quick-stats">
                      <div className="stat-card">
                        <span className="stat-number">{dashboardSummary?.totalClassrooms || 0}</span>
                        <span className="stat-label">Classrooms</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-number">{dashboardSummary?.totalAssignments || 0}</span>
                        <span className="stat-label">Assignments</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-number">{dashboardSummary?.totalSubmissions || 0}</span>
                        <span className="stat-label">Submissions</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Legacy API Tester (transitional) */}
          {showLegacyTester && (
            <div className="legacy-tester">
              <h3>🔧 Legacy API Tester</h3>
              <ExternalApiTester />
              {messages && messages.length > 0 && (
                <div className="legacy-messages">
                  <h4>Recent Messages:</h4>
                  {messages.slice(-3).map((message) => (
                    <div key={message._id} className="legacy-message">
                      <strong>{message.user}:</strong> {message.body}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ExternalApiTester() {
  const [testUser, setTestUser] = useState("External API");
  const [testMessage, setTestMessage] = useState("Hello from external call!");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const testDirectMutation = async () => {
    setIsLoading(true);
    setResponse("");

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL;

      const response = await fetch(`${convexUrl}/api/mutation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: "chat:sendMessage",
          args: {
            user: testUser,
            body: testMessage
          },
          format: "json"
        })
      });

      if (response.ok) {
        const result = await response.json();
        setResponse(`✅ Success! Message sent. Response: ${JSON.stringify(result)}`);
      } else {
        const error = await response.text();
        setResponse(`❌ Error: ${response.status} - ${error}`);
      }
    } catch (error) {
      setResponse(`❌ Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetMessages = async () => {
    setIsLoading(true);
    setResponse("");

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL;

      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: "chat:getMessages",
          args: {},
          format: "json"
        })
      });

      if (response.ok) {
        const result = await response.json();
        setResponse(`✅ Success! Retrieved ${result.length} messages. Latest: ${result[result.length - 1]?.body || 'None'}`);
      } else {
        const error = await response.text();
        setResponse(`❌ Error: ${response.status} - ${error}`);
      }
    } catch (error) {
      setResponse(`❌ Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--secondary-background)',
      border: '2px solid var(--primary)',
      borderRadius: '12px',
      padding: '20px',
      margin: '20px auto',
      maxWidth: '380px',
      color: 'var(--primary-text)'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>
        🧪 External API Tester
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--secondary-text)' }}>
        Test direct HTTP calls to Convex backend (simulating external apps like AppScript)
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Test User:</label>
        <input
          value={testUser}
          onChange={(e) => setTestUser(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Test Message:</label>
        <input
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={testDirectMutation}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isLoading ? '⏳' : '📤'} Send Message
        </button>

        <button
          onClick={testGetMessages}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isLoading ? '⏳' : '📥'} Get Messages
        </button>
      </div>

      {response && (
        <div style={{
          padding: '12px',
          backgroundColor: response.startsWith('✅') ? '#d1fae5' : '#fee2e2',
          color: response.startsWith('✅') ? '#065f46' : '#991b1b',
          borderRadius: '6px',
          fontSize: '13px',
          wordBreak: 'break-word'
        }}>
          {response}
        </div>
      )}
    </div>
  );
}

function getOrSetUserId() {
  const USER_ID_KEY = "autograding_user_id";
  let userId = sessionStorage.getItem(USER_ID_KEY);
  if (!userId) {
    // In a real app, this would come from authentication
    userId = `${faker.person.firstName().toLowerCase()}@example.com`;
    sessionStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
