import { useState } from "react";
import { faker } from "@faker-js/faker";
import { Button } from "@/components/Button";

// For demo purposes. In a real app, you'd have real user authentication.
const USER_ID = getOrSetUserId();

export default function App() {
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mock data for E2E testing
  const dashboardSummary = {
    totalClassrooms: 3,
    totalAssignments: 12,
    totalSubmissions: 145
  };

  const mockClassrooms = [
    {
      id: 'classroom-1',
      name: 'React Fundamentals',
      courseState: 'ACTIVE',
      studentCount: 25
    },
    {
      id: 'classroom-2',
      name: 'TypeScript Advanced',
      courseState: 'ACTIVE',
      studentCount: 18
    },
    {
      id: 'classroom-3',
      name: 'Node.js Backend',
      courseState: 'ARCHIVED',
      studentCount: 32
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="dashboard-container">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="dashboard-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              data-testid="mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">🐄 moo</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">Welcome, {USER_ID}</span>
            <Button variant="ghost" size="sm">Settings</Button>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className={`w-80 bg-white border-r border-gray-200 p-6 ${mobileMenuOpen ? 'block' : 'hidden'} md:block`} data-testid="classroom-sidebar">
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-white" data-testid="mobile-sidebar">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Classrooms</h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {mockClassrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      data-testid="classroom-card"
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedClassroomId === classroom.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedClassroomId(classroom.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <h3 className="font-medium text-gray-900">{classroom.name}</h3>
                      <p className="text-sm text-gray-600">{classroom.studentCount} students</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Classrooms</h2>

          <div className="space-y-3" data-testid="classroom-list">
            {mockClassrooms.map((classroom) => (
              <div
                key={classroom.id}
                data-testid="classroom-card"
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedClassroomId === classroom.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedClassroomId(classroom.id)}
              >
                <h3 className="font-medium text-gray-900">{classroom.name}</h3>
                <p className="text-sm text-gray-600">{classroom.studentCount} students</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  classroom.courseState === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {classroom.courseState}
                </span>
              </div>
            ))}
          </div>

          {mockClassrooms.length === 0 && (
            <div className="text-center py-8" data-testid="empty-classrooms">
              <p className="text-gray-500">No classrooms found</p>
              <Button className="mt-4">Sync from Google Classroom</Button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" data-testid="dashboard-stats">
            <div className="bg-white p-6 rounded-lg border border-gray-200" data-testid="stat-card">
              <h3 className="text-sm font-medium text-gray-600">Classrooms</h3>
              <p className="text-3xl font-bold text-gray-900">{dashboardSummary.totalClassrooms}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200" data-testid="stat-card">
              <h3 className="text-sm font-medium text-gray-600">Assignments</h3>
              <p className="text-3xl font-bold text-gray-900">{dashboardSummary.totalAssignments}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200" data-testid="stat-card">
              <h3 className="text-sm font-medium text-gray-600">Submissions</h3>
              <p className="text-3xl font-bold text-gray-900">{dashboardSummary.totalSubmissions}</p>
            </div>
          </div>

          {/* Assignment Panel */}
          {selectedClassroomId ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="assignment-panel">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Assignments - {mockClassrooms.find(c => c.id === selectedClassroomId)?.name}
              </h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900">Assignment {i}</h3>
                    <p className="text-sm text-gray-600">Due in {i * 2} days</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm">Grade</Button>
                      <Button variant="secondary" size="sm">View Submissions</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center" data-testid="no-classroom-selected">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to moo</h2>
              <p className="text-gray-600">Select a classroom from the sidebar to view assignments and start grading.</p>
            </div>
          )}
        </div>
      </main>
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
