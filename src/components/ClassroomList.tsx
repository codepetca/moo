import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface Classroom {
  _id: string;
  courseId: string;
  courseName: string;
  courseState: string;
  lastSyncTime: number;
  section?: string;
  room?: string;
}

interface ClassroomListProps {
  classrooms: Classroom[];
  selectedClassroomId: string | null;
  onSelectClassroom: (courseId: string) => void;
  userId: string;
}

export default function ClassroomList({
  classrooms,
  selectedClassroomId,
  onSelectClassroom,
  userId
}: ClassroomListProps) {
  return (
    <div className="classroom-list">
      <div className="sidebar-header">
        <h2>📚 Your Classrooms</h2>
        <span className="classroom-count">{classrooms.length} active</span>
      </div>

      {classrooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏫</div>
          <h3>No Classrooms Found</h3>
          <p>Use the Apps Script webapp to configure your first classroom assignment.</p>
          <a
            href="https://script.google.com/d/1KT1kNn4nYGqmRX3HYSX1Db2CB8z9pbbA30dcAuq8WLntmLaylixDVG3r/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="setup-link"
          >
            🚀 Setup New Assignment
          </a>
        </div>
      ) : (
        <div className="classroom-grid">
          {classrooms.map((classroom) => (
            <ClassroomCard
              key={classroom._id}
              classroom={classroom}
              isSelected={selectedClassroomId === classroom.courseId}
              onSelect={() => onSelectClassroom(classroom.courseId)}
              userId={userId}
            />
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <a
          href="https://script.google.com/d/1KT1kNn4nYGqmRX3HYSX1Db2CB8z9pbbA30dcAuq8WLntmLaylixDVG3r/edit"
          target="_blank"
          rel="noopener noreferrer"
          className="add-classroom-btn"
        >
          <span>➕</span>
          Add New Assignment
        </a>
      </div>
    </div>
  );
}

interface ClassroomCardProps {
  classroom: Classroom;
  isSelected: boolean;
  onSelect: () => void;
  userId: string;
}

function ClassroomCard({ classroom, isSelected, onSelect, userId }: ClassroomCardProps) {
  // Get assignment count for this classroom
  const assignments = useQuery(api.autograding.getAssignments, {
    userId,
    courseId: classroom.courseId
  });

  const assignmentCount = assignments?.length || 0;
  const lastSync = new Date(classroom.lastSyncTime);
  const isRecentlyActive = Date.now() - classroom.lastSyncTime < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div
      className={`classroom-card ${isSelected ? 'selected' : ''} ${isRecentlyActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="classroom-header">
        <h3 className="classroom-name">{classroom.courseName}</h3>
        {isRecentlyActive && <span className="activity-indicator">🟢</span>}
      </div>

      <div className="classroom-details">
        {classroom.section && (
          <div className="classroom-meta">
            <span className="meta-label">Section:</span>
            <span className="meta-value">{classroom.section}</span>
          </div>
        )}

        {classroom.room && (
          <div className="classroom-meta">
            <span className="meta-label">Room:</span>
            <span className="meta-value">{classroom.room}</span>
          </div>
        )}

        <div className="classroom-meta">
          <span className="meta-label">Course ID:</span>
          <span className="meta-value course-id">{classroom.courseId}</span>
        </div>
      </div>

      <div className="classroom-stats">
        <div className="stat-item">
          <span className="stat-number">{assignmentCount}</span>
          <span className="stat-label">Assignment{assignmentCount !== 1 ? 's' : ''}</span>
        </div>

        <div className="stat-item">
          <span className="stat-number">0</span>
          <span className="stat-label">Submission{0 !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="classroom-footer">
        <span className="last-sync">
          Last sync: {lastSync.toLocaleDateString()}
        </span>
        {isSelected && <span className="selected-indicator">✓ Selected</span>}
      </div>
    </div>
  );
}