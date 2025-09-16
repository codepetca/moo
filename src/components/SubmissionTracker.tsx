import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

interface Submission {
  _id: string;
  assignmentId: string;
  courseId: string;
  courseWorkId: string;
  formId: string;
  studentId: string;
  studentEmail?: string;
  submissionId: string;
  state: string;
  lastSyncTime: number;
  totalScore?: number;
  totalPossible?: number;
  percentageScore?: number;
  autoGraded: boolean;
  gradingTimestamp?: number;
  responses: {
    questionId: string;
    questionTitle: string;
    questionType: string;
    response: string | string[];
    textResponse?: string;
    fileUploadAnswers?: string[];
  }[];
  gradingResults?: {
    questionId: string;
    isCorrect: boolean;
    pointsEarned: number;
    pointsPossible: number;
    feedback?: string;
  }[];
}

interface SubmissionTrackerProps {
  assignmentId: string;
  courseId: string;
  userId: string;
}

export default function SubmissionTracker({ assignmentId, courseId, userId }: SubmissionTrackerProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("submissionTime");

  // Get submissions for this assignment
  const submissions = useQuery(api.autograding.getSubmissions, {
    assignmentId: assignmentId as any,
    courseId
  });

  // Get assignment details for context
  const assignment = useQuery(api.autograding.getAssignments, {
    userId,
    courseId
  })?.find(a => a._id === assignmentId);

  if (!submissions) {
    return (
      <div className="submission-tracker loading">
        <div className="tracker-header skeleton">
          <div className="skeleton-text large"></div>
          <div className="skeleton-text small"></div>
        </div>
        <div className="submissions-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="submission-card skeleton">
              <div className="skeleton-text"></div>
              <div className="skeleton-text"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter and sort submissions
  const filteredSubmissions = submissions
    .filter(submission => {
      if (filterStatus === "all") return true;
      if (filterStatus === "graded") return submission.autoGraded;
      if (filterStatus === "ungraded") return !submission.autoGraded;
      if (filterStatus === "turned_in") return submission.state === "TURNED_IN";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "submissionTime") return b.lastSyncTime - a.lastSyncTime;
      if (sortBy === "score") return (b.totalScore || 0) - (a.totalScore || 0);
      if (sortBy === "studentEmail") return (a.studentEmail || '').localeCompare(b.studentEmail || '');
      return 0;
    });

  const gradedCount = submissions.filter(s => s.autoGraded).length;
  const averageScore = submissions.length > 0
    ? submissions.filter(s => s.totalScore !== undefined).reduce((sum, s) => sum + (s.totalScore || 0), 0) / submissions.filter(s => s.totalScore !== undefined).length
    : 0;

  return (
    <div className="submission-tracker">
      <div className="tracker-header">
        <div className="tracker-title">
          <h3>📊 Submission Tracker</h3>
          {assignment && (
            <p className="assignment-context">
              {assignment.title} • {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="tracker-stats">
          <div className="stat-item">
            <span className="stat-number">{submissions.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{gradedCount}</span>
            <span className="stat-label">Graded</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{averageScore.toFixed(1)}</span>
            <span className="stat-label">Avg Score</span>
          </div>
        </div>
      </div>

      <div className="tracker-controls">
        <div className="filter-controls">
          <label htmlFor="status-filter">Filter:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Submissions</option>
            <option value="graded">Auto-graded</option>
            <option value="ungraded">Not Graded</option>
            <option value="turned_in">Turned In</option>
          </select>
        </div>

        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="submissionTime">Submission Time</option>
            <option value="score">Score</option>
            <option value="studentEmail">Student Email</option>
          </select>
        </div>

        <button
          className="refresh-btn"
          onClick={() => window.location.reload()}
          title="Refresh submissions"
        >
          🔄 Refresh
        </button>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="empty-submissions">
          <div className="empty-icon">📝</div>
          <h4>No Submissions Found</h4>
          <p>
            {filterStatus === "all"
              ? "No students have submitted this assignment yet."
              : `No submissions match the ${filterStatus} filter.`}
          </p>
        </div>
      ) : (
        <div className="submissions-grid">
          {filteredSubmissions.map((submission) => (
            <SubmissionCard
              key={submission._id}
              submission={submission}
              isSelected={selectedSubmissionId === submission._id}
              onSelect={() => setSelectedSubmissionId(submission._id)}
            />
          ))}
        </div>
      )}

      {selectedSubmissionId && (
        <SubmissionDetails
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
        />
      )}
    </div>
  );
}

interface SubmissionCardProps {
  submission: Submission;
  isSelected: boolean;
  onSelect: () => void;
}

function SubmissionCard({ submission, isSelected, onSelect }: SubmissionCardProps) {
  const submissionDate = new Date(submission.lastSyncTime);
  const isRecent = Date.now() - submission.lastSyncTime < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div
      className={`submission-card ${isSelected ? 'selected' : ''} ${submission.autoGraded ? 'graded' : 'ungraded'}`}
      onClick={onSelect}
    >
      <div className="submission-header">
        <div className="student-info">
          <h4 className="student-name">
            {submission.studentEmail || submission.studentId}
          </h4>
          {isRecent && <span className="recent-indicator">🆕</span>}
        </div>

        <div className="submission-status">
          {submission.autoGraded ? (
            <span className="status-badge graded">
              ✅ Auto-graded
            </span>
          ) : (
            <span className="status-badge ungraded">
              ⏳ Pending
            </span>
          )}
        </div>
      </div>

      <div className="submission-details">
        <div className="detail-row">
          <span className="detail-label">Submitted:</span>
          <span className="detail-value">
            {submissionDate.toLocaleDateString()} {submissionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">State:</span>
          <span className={`detail-value state-${submission.state.toLowerCase()}`}>
            {submission.state.replace('_', ' ')}
          </span>
        </div>

        {submission.totalScore !== undefined && submission.totalPossible && (
          <div className="detail-row">
            <span className="detail-label">Score:</span>
            <span className="detail-value score">
              {submission.totalScore}/{submission.totalPossible} ({submission.percentageScore || Math.round((submission.totalScore / submission.totalPossible) * 100)}%)
            </span>
          </div>
        )}
      </div>

      <div className="submission-footer">
        <div className="response-count">
          {submission.responses.length} response{submission.responses.length !== 1 ? 's' : ''}
        </div>

        <div className="submission-actions">
          <button className="action-btn small">👁️ View</button>
          {!submission.autoGraded && (
            <button className="action-btn small primary">⚡ Grade</button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SubmissionDetailsProps {
  submissionId: string;
  onClose: () => void;
}

function SubmissionDetails({ submissionId, onClose }: SubmissionDetailsProps) {
  // Get detailed submission data
  const submission = useQuery(api.autograding.getSubmissionDetails, {
    submissionId: submissionId as any
  });

  return (
    <div className="submission-details-overlay">
      <div className="submission-details">
        <div className="details-header">
          <h3>Submission Details</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="details-content">
          {!submission ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading submission details...</p>
            </div>
          ) : (
            <div className="submission-content">
              <div className="student-section">
                <h4>👤 Student Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{submission.studentEmail || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Student ID:</label>
                    <span>{submission.studentId}</span>
                  </div>
                  <div className="info-item">
                    <label>Submission ID:</label>
                    <span>{submission.submissionId}</span>
                  </div>
                </div>
              </div>

              <div className="responses-section">
                <h4>📝 Responses ({submission.responses.length})</h4>
                <div className="responses-list">
                  {submission.responses.map((response, index) => {
                    const gradingResult = submission.gradingResults?.find(gr => gr.questionId === response.questionId);
                    return (
                      <div key={response.questionId} className="response-item">
                        <div className="response-header">
                          <span className="response-number">Q{index + 1}</span>
                          <span className="response-type">{response.questionType}</span>
                          {gradingResult && (
                            <span className="response-points">{gradingResult.pointsEarned}/{gradingResult.pointsPossible} pts</span>
                          )}
                        </div>
                        <div className="response-content">
                          <div className="response-title">
                            <strong>{response.questionTitle}</strong>
                          </div>
                          <div className="response-answer">
                            <strong>Answer:</strong> {Array.isArray(response.response) ? response.response.join(', ') : response.response}
                          </div>
                          {gradingResult?.feedback && (
                            <div className="response-feedback">
                              <strong>Feedback:</strong> {gradingResult.feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {submission.autoGraded && submission.gradingTimestamp && (
                <div className="grading-section">
                  <h4>⚡ Auto-grading Results</h4>
                  <div className="grading-info">
                    <div className="info-item">
                      <label>Graded at:</label>
                      <span>{new Date(submission.gradingTimestamp).toLocaleString()}</span>
                    </div>
                    <div className="info-item">
                      <label>Final Score:</label>
                      <span className="final-score">
                        {submission.totalScore}/{submission.totalPossible} ({submission.percentageScore || Math.round((submission.totalScore! / submission.totalPossible!) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="details-footer">
          <button className="action-btn secondary" onClick={onClose}>
            Close
          </button>
          {submission && !submission.autoGraded && (
            <button className="action-btn primary">
              ⚡ Grade Now
            </button>
          )}
          {submission && submission.autoGraded && (
            <button className="action-btn primary">
              📊 Export Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}