import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import SubmissionTracker from "./SubmissionTracker";

interface Assignment {
  _id: string;
  courseWorkId: string;
  formId: string;
  title: string;
  description?: string;
  state: string;
  dueDate?: string;
  maxPoints?: number;
  lastSyncTime: number;
}

interface AssignmentPanelProps {
  classroomId: string;
  userId: string;
}

export default function AssignmentPanel({ classroomId, userId }: AssignmentPanelProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Get classroom details
  const classroom = useQuery(api.autograding.getClassroom, {
    userId,
    courseId: classroomId
  });

  // Get assignments for this classroom
  const assignments = useQuery(api.autograding.getAssignments, {
    userId,
    courseId: classroomId
  });

  if (!classroom) {
    return (
      <div className="assignment-panel loading">
        <div className="panel-header skeleton">
          <div className="skeleton-text large"></div>
          <div className="skeleton-text small"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-panel">
      <div className="panel-header">
        <div className="classroom-info">
          <h2>{classroom.courseName}</h2>
          <p className="classroom-details">
            Course ID: {classroom.courseId}
            {classroom.section && ` • Section: ${classroom.section}`}
            {classroom.room && ` • Room: ${classroom.room}`}
          </p>
        </div>

        <div className="panel-actions">
          <a
            href="https://script.google.com/d/1KT1kNn4nYGqmRX3HYSX1Db2CB8z9pbbA30dcAuq8WLntmLaylixDVG3r/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn primary"
          >
            ➕ Add Assignment
          </a>
        </div>
      </div>

      <div className="assignments-section">
        <div className="section-header">
          <h3>📝 Assignments ({assignments?.length || 0})</h3>
        </div>

        {!assignments || assignments.length === 0 ? (
          <div className="empty-assignments">
            <div className="empty-icon">📝</div>
            <h4>No Assignments Configured</h4>
            <p>Use the Apps Script webapp to set up your first autograding assignment for this classroom.</p>
            <a
              href="https://script.google.com/d/1KT1kNn4nYGqmRX3HYSX1Db2CB8z9pbbA30dcAuq8WLntmLaylixDVG3r/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="setup-btn"
            >
              🚀 Setup Assignment
            </a>
          </div>
        ) : (
          <div className="assignments-grid">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                isSelected={selectedAssignmentId === assignment._id}
                onSelect={() => setSelectedAssignmentId(assignment._id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedAssignmentId && (
        <div className="submission-tracker-section">
          <SubmissionTracker
            assignmentId={selectedAssignmentId}
            courseId={classroomId}
            userId={userId}
          />
        </div>
      )}

      {selectedAssignmentId && (
        <AssignmentDetails
          assignmentId={selectedAssignmentId}
          onClose={() => setSelectedAssignmentId(null)}
        />
      )}
    </div>
  );
}

interface AssignmentCardProps {
  assignment: Assignment;
  isSelected: boolean;
  onSelect: () => void;
}

function AssignmentCard({ assignment, isSelected, onSelect }: AssignmentCardProps) {
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date();
  const isDueSoon = dueDate && dueDate > new Date() && dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div
      className={`assignment-card ${isSelected ? 'selected' : ''} ${isOverdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''}`}
      onClick={onSelect}
    >
      <div className="assignment-header">
        <h4 className="assignment-title">{assignment.title}</h4>
        <span className={`assignment-status ${assignment.state.toLowerCase()}`}>
          {assignment.state}
        </span>
      </div>

      {assignment.description && (
        <p className="assignment-description">{assignment.description}</p>
      )}

      <div className="assignment-meta">
        <div className="meta-row">
          <span className="meta-label">Form ID:</span>
          <span className="meta-value">{assignment.formId}</span>
        </div>

        {assignment.maxPoints && (
          <div className="meta-row">
            <span className="meta-label">Max Points:</span>
            <span className="meta-value">{assignment.maxPoints}</span>
          </div>
        )}

        {dueDate && (
          <div className="meta-row">
            <span className="meta-label">Due Date:</span>
            <span className={`meta-value ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}`}>
              {dueDate.toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
              {isDueSoon && ' (Due Soon)'}
            </span>
          </div>
        )}
      </div>

      <div className="assignment-stats">
        <div className="stat-item">
          <span className="stat-number">0</span>
          <span className="stat-label">Submissions</span>
        </div>

        <div className="stat-item">
          <span className="stat-number">0</span>
          <span className="stat-label">Graded</span>
        </div>
      </div>

      <div className="assignment-footer">
        <span className="last-sync">
          Updated: {new Date(assignment.lastSyncTime).toLocaleDateString()}
        </span>

        <div className="assignment-actions">
          <button className="action-btn small">⚙️ Configure</button>
          <button className="action-btn small">📊 View Results</button>
        </div>
      </div>
    </div>
  );
}

interface AssignmentDetailsProps {
  assignmentId: string;
  onClose: () => void;
}

function AssignmentDetails({ assignmentId, onClose }: AssignmentDetailsProps) {
  // Get grading configuration for this assignment
  const gradingConfig = useQuery(api.autograding.getGradingConfig, {
    assignmentId: assignmentId as any // Type assertion for the ID
  });

  return (
    <div className="assignment-details-overlay">
      <div className="assignment-details">
        <div className="details-header">
          <h3>Assignment Configuration</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="details-content">
          {!gradingConfig ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading assignment configuration...</p>
            </div>
          ) : (
            <div className="config-details">
              <div className="config-section">
                <h4>📝 Form Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Form Title:</label>
                    <span>{gradingConfig.formTitle}</span>
                  </div>
                  <div className="info-item">
                    <label>Total Points:</label>
                    <span>{gradingConfig.totalPoints}</span>
                  </div>
                  <div className="info-item">
                    <label>Auto-grading:</label>
                    <span className={gradingConfig.autoGradingEnabled ? 'enabled' : 'disabled'}>
                      {gradingConfig.autoGradingEnabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h4>❓ Questions ({gradingConfig.questions.length})</h4>
                <div className="questions-list">
                  {gradingConfig.questions.map((question, index) => (
                    <div key={question.questionId} className="question-item">
                      <div className="question-header">
                        <span className="question-number">Q{index + 1}</span>
                        <span className="question-type">{question.questionType}</span>
                        <span className="question-points">{question.points} pts</span>
                      </div>
                      <div className="question-title">{question.title}</div>
                      {question.choices && question.choices.length > 0 && (
                        <div className="question-choices">
                          {question.choices.map((choice, i) => (
                            <span
                              key={i}
                              className={`choice ${choice === question.correctAnswer ? 'correct' : ''}`}
                            >
                              {choice}
                              {choice === question.correctAnswer && ' ✓'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="details-footer">
          <button className="action-btn secondary" onClick={onClose}>
            Close
          </button>
          <button className="action-btn primary">
            📊 View Submissions
          </button>
        </div>
      </div>
    </div>
  );
}