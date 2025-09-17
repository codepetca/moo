/**
 * Google Apps Script functions for interacting with moo Autograding Backend
 *
 * Setup Instructions:
 * 1. Go to script.google.com
 * 2. Create a new project
 * 3. Copy this code into the Code.gs file
 * 4. Update the CONVEX_URL constant with your deployment URL
 * 5. Save and run the functions
 */

// Your Convex deployment URL
const CONVEX_URL = "https://rapid-nightingale-951.convex.cloud";

/**
 * Simple test function to send a message to the chat
 * This is the main function you'll want to test first
 */
function testSendMessage() {
  const user = "Google Apps Script";
  const message = "Hello from Apps Script! 🚀";

  try {
    const result = sendMessage(user, message);
    console.log("Message sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending message:", error);
    return { error: error.toString() };
  }
}

/**
 * Core function to send a message to Convex
 * @param {string} user - The username
 * @param {string} message - The message text
 * @returns {Object} - The response from Convex
 */
function sendMessage(user, message) {
  const payload = {
    path: "chat:sendMessage",
    args: {
      user: user,
      body: message
    },
    format: "json"
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(`${CONVEX_URL}/api/mutation`, options);

  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Function to retrieve all messages from the chat
 * @returns {Array} - Array of message objects
 */
function getMessages() {
  const payload = {
    path: "chat:getMessages",
    args: {},
    format: "json"
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(`${CONVEX_URL}/api/query`, options);

    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }

    const result = JSON.parse(response.getContentText());
    console.log(`Retrieved ${result.length} messages`);
    return result;

  } catch (error) {
    console.error("Error getting messages:", error);
    return { error: error.toString() };
  }
}

/**
 * Test function to trigger a Wikipedia lookup
 */
function testWikipediaLookup() {
  const user = "Apps Script Bot";
  const wikiCommand = "/wiki Google Apps Script";

  try {
    const result = sendMessage(user, wikiCommand);
    console.log("Wikipedia command sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending wiki command:", error);
    return { error: error.toString() };
  }
}

/**
 * Function to send multiple test messages
 */
function sendMultipleTestMessages() {
  const messages = [
    "First test message from Apps Script",
    "Second message with emoji 🎉",
    "Third message with timestamp: " + new Date().toISOString()
  ];

  const results = [];

  for (let i = 0; i < messages.length; i++) {
    try {
      const result = sendMessage("Batch Tester", messages[i]);
      results.push({ success: true, message: messages[i], result: result });
      Utilities.sleep(1000); // Wait 1 second between messages
    } catch (error) {
      results.push({ success: false, message: messages[i], error: error.toString() });
    }
  }

  console.log("Batch send results:", results);
  return results;
}

/**
 * Function to get and display the latest messages
 */
function showLatestMessages() {
  try {
    const messages = getMessages();

    if (messages.error) {
      console.error("Error:", messages.error);
      return;
    }

    console.log("=== LATEST MESSAGES ===");
    messages.slice(-5).forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.user}]: ${msg.body}`);
    });

    return messages;
  } catch (error) {
    console.error("Error displaying messages:", error);
  }
}

/**
 * Comprehensive test function that runs all tests
 */
function runAllTests() {
  console.log("🧪 Starting comprehensive Convex API tests...");

  // Test 1: Send a simple message
  console.log("\n📤 Test 1: Sending a simple message");
  testSendMessage();

  // Wait a moment
  Utilities.sleep(2000);

  // Test 2: Get messages
  console.log("\n📥 Test 2: Retrieving messages");
  showLatestMessages();

  // Wait a moment
  Utilities.sleep(2000);

  // Test 3: Wikipedia command
  console.log("\n📚 Test 3: Wikipedia lookup");
  testWikipediaLookup();

  // Wait a moment
  Utilities.sleep(2000);

  // Test 4: Batch messages
  console.log("\n📦 Test 4: Batch messages");
  sendMultipleTestMessages();

  console.log("\n✅ All tests completed!");
}

/**
 * Function to create a time-triggered message sender
 * This can be used with Apps Script triggers for automated messages
 */
function sendScheduledMessage() {
  const currentTime = new Date().toLocaleString();
  const message = `Scheduled message sent at ${currentTime}`;

  try {
    const result = sendMessage("Scheduler Bot", message);
    console.log("Scheduled message sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending scheduled message:", error);
    return { error: error.toString() };
  }
}

// ============================================
// WEBAPP FUNCTIONS
// ============================================

/**
 * Serve the HTML webapp
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Convex Autograding Setup')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// GOOGLE CLASSROOM INTEGRATION FUNCTIONS
// ============================================

/**
 * Helper function to get unarchived (active) Google Classrooms where user is a teacher
 * @returns {Array} Array of classroom objects with name and id for courses where user is teacher/owner
 */
function getUnarchivedClassrooms() {
  try {
    // Check if Classroom API is available
    if (typeof Classroom === 'undefined') {
      throw new Error('Classroom API not enabled. Please add Google Classroom API as an advanced service.');
    }

    const optionalArgs = {
      pageSize: 50, // Increase to get more courses if needed
      courseStates: ['ACTIVE'], // Only get active (unarchived) courses
      teacherId: 'me' // Only get courses where current user is a teacher/owner
    };

    console.log('Fetching unarchived classrooms where user is teacher...');
    const response = Classroom.Courses.list(optionalArgs);
    const courses = response.courses;

    if (!courses || courses.length === 0) {
      console.log('No active courses found where user is teacher.');
      return [];
    }

    console.log(`Found ${courses.length} active course(s) where user is teacher`);

    // Return array of course objects with name and id
    return courses.map(course => ({
      name: course.name,
      id: course.id,
      alternateLink: course.alternateLink,
      courseState: course.courseState
    }));

  } catch (error) {
    console.error('Error fetching classrooms:', error);
    throw error;
  }
}

/**
 * Main function to list unarchived Google Classrooms where user is a teacher and send to Convex chat
 * This function fetches active classrooms where the user is a teacher/owner and posts their names as a message
 */
function listClassroomsAndSend() {
  try {
    console.log('Starting classroom listing process...');

    // Get unarchived classrooms where user is teacher
    const classrooms = getUnarchivedClassrooms();

    let message;

    if (classrooms.length === 0) {
      message = "📚 No active Google Classrooms found where you are a teacher. You may not be teaching any courses, or they might all be archived.";
    } else {
      // Format the classroom names into a nice message
      const classroomList = classrooms.map((classroom, index) =>
        `${index + 1}. ${classroom.name}`
      ).join('\n');

      message = `📚 Your Teaching Classrooms (${classrooms.length} total):\n\n${classroomList}`;
    }

    // Send the message to Convex
    console.log('Sending classroom list to Convex...');
    const result = sendMessage("Classroom Bot", message);

    console.log('Classroom list sent successfully:', result);
    return {
      success: true,
      classroomsFound: classrooms.length,
      classrooms: classrooms,
      convexResponse: result
    };

  } catch (error) {
    console.error('Error in listClassroomsAndSend:', error);

    // Send error message to chat
    let errorMessage = "❌ Error fetching Google Classrooms: ";

    if (error.message.includes('Classroom API not enabled')) {
      errorMessage += "Google Classroom API is not enabled. Please add it as an advanced service in your Apps Script project.";
    } else if (error.message.includes('insufficient permission') || error.message.includes('access denied')) {
      errorMessage += "Permission denied. Please ensure you have access to Google Classroom and have authorized the necessary permissions.";
    } else {
      errorMessage += error.message;
    }

    try {
      sendMessage("System Error", errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }

    return {
      success: false,
      error: error.toString(),
      classroomsFound: 0
    };
  }
}

/**
 * Test function to check Classroom API connectivity
 * Use this to verify the API is working before running the main function
 */
function testClassroomConnection() {
  try {
    console.log('Testing Google Classroom API connection...');

    if (typeof Classroom === 'undefined') {
      throw new Error('Classroom API not available. Please enable it in Services.');
    }

    // Try to get just one course to test the connection
    const response = Classroom.Courses.list({ pageSize: 1 });

    console.log('✅ Classroom API connection successful!');
    console.log('API Response:', response);

    const message = "✅ Google Classroom API connection test successful! Ready to list classrooms.";
    sendMessage("API Test", message);

    return { success: true, message: "Connection test passed" };

  } catch (error) {
    console.error('❌ Classroom API connection failed:', error);

    const errorMessage = `❌ Classroom API test failed: ${error.message}`;
    try {
      sendMessage("API Test", errorMessage);
    } catch (sendError) {
      console.error('Failed to send test error message:', sendError);
    }

    return { success: false, error: error.toString() };
  }
}

// ============================================
// WEBAPP API FUNCTIONS
// ============================================

/**
 * Get classrooms for webapp dropdown
 * Returns formatted classroom data for the UI
 */
function getTeacherClassrooms() {
  try {
    console.log('Getting teacher classrooms for webapp...');

    // Check if Classroom API is available
    if (typeof Classroom === 'undefined') {
      throw new Error('Classroom API not enabled. Please add Google Classroom API as an advanced service.');
    }

    const optionalArgs = {
      pageSize: 50,
      courseStates: ['ACTIVE'],
      teacherId: 'me'
    };

    const response = Classroom.Courses.list(optionalArgs);
    const courses = response.courses;

    if (!courses || courses.length === 0) {
      return {
        success: true,
        classrooms: [],
        message: 'No active courses found where you are a teacher.'
      };
    }

    // Format classrooms for webapp
    const classrooms = courses.map(course => ({
      id: course.id,
      name: course.name,
      section: course.section || '',
      room: course.room || '',
      ownerId: course.ownerId,
      creationTime: course.creationTime,
      updateTime: course.updateTime,
      enrollmentCode: course.enrollmentCode,
      courseState: course.courseState,
      alternateLink: course.alternateLink
    }));

    console.log(`Found ${classrooms.length} teacher classrooms`);

    return {
      success: true,
      classrooms: classrooms,
      message: `Found ${classrooms.length} classroom(s)`
    };

  } catch (error) {
    console.error('Error getting teacher classrooms:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      classrooms: []
    };
  }
}

/**
 * Get form assignments for a specific course
 * Filters for assignments that have Google Forms attached
 */
function getFormAssignments(courseId) {
  try {
    console.log(`Getting form assignments for course: ${courseId}`);

    if (typeof Classroom === 'undefined') {
      throw new Error('Classroom API not enabled.');
    }

    const optionalArgs = {
      pageSize: 50,
      courseStates: ['PUBLISHED']
    };

    const response = Classroom.Courses.CourseWork.list(courseId, optionalArgs);
    const courseWork = response.courseWork;

    if (!courseWork || courseWork.length === 0) {
      return {
        success: true,
        assignments: [],
        message: 'No assignments found for this course.'
      };
    }

    // Filter for assignments with Google Forms
    const formAssignments = courseWork.filter(work => {
      // Check if assignment has materials with Google Forms
      if (!work.materials) return false;

      return work.materials.some(material => {
        return material.form && material.form.formUrl;
      });
    });

    // Format assignments for webapp
    const assignments = formAssignments.map(work => {
      // Find the form material
      const formMaterial = work.materials.find(material => material.form);
      const form = formMaterial ? formMaterial.form : null;

      return {
        id: work.id,
        title: work.title,
        description: work.description || '',
        state: work.state,
        alternateLink: work.alternateLink,
        creationTime: work.creationTime,
        updateTime: work.updateTime,
        dueDate: work.dueDate ? formatDueDate(work.dueDate) : null,
        maxPoints: work.maxPoints || null,
        workType: work.workType,
        formId: form ? extractFormId(form.formUrl) : null,
        formUrl: form ? form.formUrl : null,
        formTitle: form ? form.title : 'Unknown Form'
      };
    });

    console.log(`Found ${assignments.length} form assignments`);

    return {
      success: true,
      assignments: assignments,
      message: `Found ${assignments.length} form assignment(s)`
    };

  } catch (error) {
    console.error('Error getting form assignments:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      assignments: []
    };
  }
}

/**
 * Extract form ID from Google Forms URL
 */
function extractFormId(formUrl) {
  const match = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Format due date from Classroom API format
 */
function formatDueDate(dueDate) {
  if (!dueDate.year || !dueDate.month || !dueDate.day) {
    return null;
  }

  const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day);

  if (dueDate.time) {
    date.setHours(dueDate.time.hours || 23);
    date.setMinutes(dueDate.time.minutes || 59);
  }

  return date.toISOString();
}

/**
 * Get form questions and structure from Google Forms
 */
function getFormQuestions(formId) {
  try {
    console.log(`Getting form questions for form: ${formId}`);

    // Check if Forms service is available
    if (typeof FormApp === 'undefined') {
      throw new Error('Forms service not available.');
    }

    const form = FormApp.openById(formId);
    const items = form.getItems();

    const formInfo = {
      title: form.getTitle(),
      description: form.getDescription(),
      id: formId
    };

    const questions = items.map((item, index) => {
      const question = {
        questionId: `q${index + 1}`,
        title: item.getTitle(),
        type: item.getType().toString(),
        required: false,
        points: 1 // Default points
      };

      // Handle different question types
      switch (item.getType()) {
        case FormApp.ItemType.MULTIPLE_CHOICE:
          const mcItem = item.asMultipleChoiceItem();
          question.choices = mcItem.getChoices().map(choice => choice.getValue());
          question.required = mcItem.isRequired();
          break;

        case FormApp.ItemType.CHECKBOX:
          const cbItem = item.asCheckboxItem();
          question.choices = cbItem.getChoices().map(choice => choice.getValue());
          question.required = cbItem.isRequired();
          break;

        case FormApp.ItemType.TEXT:
          const textItem = item.asTextItem();
          question.required = textItem.isRequired();
          break;

        case FormApp.ItemType.PARAGRAPH_TEXT:
          const paraItem = item.asParagraphTextItem();
          question.required = paraItem.isRequired();
          break;

        case FormApp.ItemType.LIST:
          const listItem = item.asListItem();
          question.choices = listItem.getChoices().map(choice => choice.getValue());
          question.required = listItem.isRequired();
          break;

        default:
          // Skip unsupported question types for now
          return null;
      }

      return question;
    }).filter(q => q !== null); // Remove null entries

    console.log(`Found ${questions.length} questions in form`);

    return {
      success: true,
      formInfo: formInfo,
      questions: questions,
      message: `Found ${questions.length} question(s)`
    };

  } catch (error) {
    console.error('Error getting form questions:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      formInfo: null,
      questions: []
    };
  }
}

/**
 * Send configuration data to Convex backend
 */
function sendConfigurationToConvex(configData) {
  try {
    console.log('Sending configuration to Convex...');

    const convexUrl = CONVEX_URL;
    const payload = {
      path: "autograding:processClassroomFormData",
      args: configData,
      format: "json"
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(`${convexUrl}/api/mutation`, options);

    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }

    const result = JSON.parse(response.getContentText());

    if (result.status === 'success') {
      console.log('Configuration sent successfully:', result.value);
      return {
        success: true,
        data: result.value,
        message: result.value.message || 'Configuration saved successfully'
      };
    } else {
      throw new Error(result.error || 'Unknown error from Convex');
    }

  } catch (error) {
    console.error('Error sending configuration to Convex:', error);
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

// ============================================
// GRADE SYNCHRONIZATION FUNCTIONS
// ============================================

/**
 * Sync grades from Convex back to Google Classroom
 * This function pulls graded submissions and updates Google Classroom
 */
function syncGradesToClassroom(assignmentId, courseId, courseWorkId) {
  try {
    console.log(`Syncing grades for assignment ${assignmentId} to classroom ${courseId}, courseWork ${courseWorkId}`);

    // First, get the grades from Convex
    const gradesData = getGradesFromConvex(assignmentId);

    if (!gradesData.success) {
      throw new Error(`Failed to get grades from Convex: ${gradesData.error}`);
    }

    const { gradeEntries, syncConfig } = gradesData.data;

    if (!gradeEntries || gradeEntries.length === 0) {
      return {
        success: true,
        message: 'No grades to sync',
        syncedCount: 0,
        failedCount: 0
      };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const syncResults = [];

    // Process each grade entry
    for (const gradeEntry of gradeEntries) {
      try {
        const result = syncSingleGradeToClassroom(courseId, courseWorkId, gradeEntry, syncConfig);

        if (result.success) {
          syncedCount++;
          syncResults.push({
            studentId: gradeEntry.userId,
            success: true,
            grade: gradeEntry.assignedGrade
          });
        } else {
          failedCount++;
          syncResults.push({
            studentId: gradeEntry.userId,
            success: false,
            error: result.error
          });
        }

        // Add delay to respect API rate limits
        Utilities.sleep(500);

      } catch (error) {
        failedCount++;
        syncResults.push({
          studentId: gradeEntry.userId,
          success: false,
          error: error.message
        });
        console.error(`Failed to sync grade for student ${gradeEntry.userId}:`, error);
      }
    }

    // Report results back to Convex
    recordSyncResultsInConvex(assignmentId, syncResults);

    const successRate = Math.round((syncedCount / (syncedCount + failedCount)) * 100);

    return {
      success: failedCount === 0,
      message: `Synced ${syncedCount} grades successfully, ${failedCount} failed (${successRate}% success rate)`,
      syncedCount,
      failedCount,
      syncResults
    };

  } catch (error) {
    console.error('Error in syncGradesToClassroom:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      syncedCount: 0,
      failedCount: 0
    };
  }
}

/**
 * Sync a single grade to Google Classroom
 */
function syncSingleGradeToClassroom(courseId, courseWorkId, gradeEntry, syncConfig) {
  try {
    if (typeof Classroom === 'undefined') {
      throw new Error('Classroom API not enabled');
    }

    // Get student submissions for this assignment
    const submissions = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, courseWorkId, {
      userId: gradeEntry.userId
    });

    if (!submissions.studentSubmissions || submissions.studentSubmissions.length === 0) {
      throw new Error(`No submission found for student ${gradeEntry.userId}`);
    }

    const submission = submissions.studentSubmissions[0];
    const submissionId = submission.id;

    // Prepare the grade update
    const gradeUpdate = {
      assignedGrade: gradeEntry.assignedGrade
    };

    // Add comment if configured and available
    if (syncConfig.includeComments && gradeEntry.comment) {
      // Set private comment for instructor feedback
      gradeUpdate.draftGrade = gradeEntry.assignedGrade;

      // Add public comment
      const commentRequest = {
        comment: gradeEntry.comment
      };

      try {
        Classroom.Courses.CourseWork.StudentSubmissions.modifyAttachments(
          courseId,
          courseWorkId,
          submissionId,
          commentRequest
        );
      } catch (commentError) {
        console.warn(`Failed to add comment for student ${gradeEntry.userId}:`, commentError);
        // Continue with grade sync even if comment fails
      }
    }

    // Update the grade
    const updateMask = 'assignedGrade';
    const patchedSubmission = Classroom.Courses.CourseWork.StudentSubmissions.patch(
      gradeUpdate,
      courseId,
      courseWorkId,
      submissionId,
      { updateMask: updateMask }
    );

    console.log(`Successfully synced grade ${gradeEntry.assignedGrade} for student ${gradeEntry.userId}`);

    return {
      success: true,
      submissionId: submissionId,
      gradeSynced: gradeEntry.assignedGrade,
      student: gradeEntry.userId
    };

  } catch (error) {
    console.error(`Error syncing grade for student ${gradeEntry.userId}:`, error);
    return {
      success: false,
      error: error.message || error.toString(),
      student: gradeEntry.userId
    };
  }
}

/**
 * Get grades from Convex for syncing
 */
function getGradesFromConvex(assignmentId) {
  try {
    console.log(`Getting grades from Convex for assignment: ${assignmentId}`);

    const payload = {
      path: "classroomSync:prepareGradesForSync",
      args: {
        assignmentId: assignmentId,
        includeUngraded: false
      },
      format: "json"
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(`${CONVEX_URL}/api/query`, options);

    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }

    const result = JSON.parse(response.getContentText());

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error getting grades from Convex:', error);
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

/**
 * Record sync results back to Convex
 */
function recordSyncResultsInConvex(assignmentId, syncResults) {
  try {
    console.log(`Recording sync results in Convex for assignment: ${assignmentId}`);

    const payload = {
      path: "classroomSync:recordSyncOperation",
      args: {
        assignmentId: assignmentId,
        syncResults: syncResults.map(result => ({
          submissionId: `apps-script-${result.studentId}`,
          studentId: result.studentId,
          success: result.success,
          error: result.error || undefined,
          gradePosted: result.grade || undefined,
          timestamp: Date.now()
        })),
        processingTime: 0, // Apps Script doesn't track this precisely
        testMode: false
      },
      format: "json"
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(`${CONVEX_URL}/api/mutation`, options);

    if (response.getResponseCode() !== 200) {
      console.warn(`Failed to record sync results: HTTP ${response.getResponseCode()}`);
      return false;
    }

    console.log('Sync results recorded successfully');
    return true;

  } catch (error) {
    console.error('Error recording sync results:', error);
    return false;
  }
}

/**
 * Bulk sync all assignments for a course
 */
function bulkSyncCourseGrades(courseId) {
  try {
    console.log(`Starting bulk sync for course: ${courseId}`);

    // Get all assignments configured for this course from Convex
    const assignmentsData = getConfiguredAssignmentsFromConvex(courseId);

    if (!assignmentsData.success) {
      throw new Error(`Failed to get configured assignments: ${assignmentsData.error}`);
    }

    const assignments = assignmentsData.data;
    const syncResults = [];

    if (!assignments || assignments.length === 0) {
      return {
        success: true,
        message: 'No configured assignments found for this course',
        assignmentsSynced: 0,
        totalGradesSynced: 0
      };
    }

    let totalGradesSynced = 0;
    let assignmentsSynced = 0;

    // Process each assignment
    for (const assignment of assignments) {
      try {
        const result = syncGradesToClassroom(
          assignment.assignmentId,
          courseId,
          assignment.courseWorkId
        );

        syncResults.push({
          assignmentId: assignment.assignmentId,
          assignmentTitle: assignment.title,
          success: result.success,
          syncedCount: result.syncedCount,
          failedCount: result.failedCount,
          message: result.message
        });

        if (result.success && result.syncedCount > 0) {
          assignmentsSynced++;
          totalGradesSynced += result.syncedCount;
        }

        // Rate limiting - wait between assignments
        Utilities.sleep(2000);

      } catch (error) {
        syncResults.push({
          assignmentId: assignment.assignmentId,
          assignmentTitle: assignment.title,
          success: false,
          error: error.message
        });
        console.error(`Failed to sync assignment ${assignment.assignmentId}:`, error);
      }
    }

    return {
      success: true,
      message: `Bulk sync completed: ${assignmentsSynced} assignments synced, ${totalGradesSynced} total grades synced`,
      assignmentsSynced,
      totalGradesSynced,
      syncResults
    };

  } catch (error) {
    console.error('Error in bulkSyncCourseGrades:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      assignmentsSynced: 0,
      totalGradesSynced: 0
    };
  }
}

/**
 * Get configured assignments from Convex
 */
function getConfiguredAssignmentsFromConvex(courseId) {
  try {
    console.log(`Getting configured assignments for course: ${courseId}`);

    const payload = {
      path: "assignments:getAssignmentsByCourse",
      args: {
        courseId: courseId
      },
      format: "json"
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(`${CONVEX_URL}/api/query`, options);

    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }

    const result = JSON.parse(response.getContentText());

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error getting configured assignments:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      data: []
    };
  }
}

/**
 * Test grade sync functionality
 */
function testGradeSync(assignmentId, courseId, courseWorkId) {
  try {
    console.log('Testing grade sync functionality...');

    // First test getting grades from Convex
    const gradesTest = getGradesFromConvex(assignmentId);
    if (!gradesTest.success) {
      throw new Error(`Failed to get grades: ${gradesTest.error}`);
    }

    console.log(`✅ Successfully retrieved ${gradesTest.data.gradeEntries?.length || 0} grades from Convex`);

    // Test sync with a single grade (if available)
    if (gradesTest.data.gradeEntries && gradesTest.data.gradeEntries.length > 0) {
      const testGrade = gradesTest.data.gradeEntries[0];

      console.log('Testing sync of single grade...');
      const syncTest = syncSingleGradeToClassroom(
        courseId,
        courseWorkId,
        testGrade,
        gradesTest.data.classroomConfig
      );

      if (syncTest.success) {
        console.log('✅ Test grade sync successful');
      } else {
        console.log(`❌ Test grade sync failed: ${syncTest.error}`);
      }

      return {
        success: syncTest.success,
        message: syncTest.success ? 'Grade sync test passed' : `Grade sync test failed: ${syncTest.error}`,
        gradesAvailable: gradesTest.data.gradeEntries.length,
        testResult: syncTest
      };
    } else {
      return {
        success: true,
        message: 'No grades available for testing, but connection to Convex is working',
        gradesAvailable: 0
      };
    }

  } catch (error) {
    console.error('Grade sync test failed:', error);
    return {
      success: false,
      error: error.message || error.toString(),
      message: `Grade sync test failed: ${error.message}`
    };
  }
}

/**
 * Scheduled function to automatically sync grades
 * Can be set up with a time-based trigger
 */
function scheduledGradeSync() {
  console.log('Starting scheduled grade sync...');

  try {
    // Get all teacher's classrooms
    const classrooms = getTeacherClassrooms();

    if (!classrooms.success || classrooms.classrooms.length === 0) {
      console.log('No classrooms found for scheduled sync');
      return;
    }

    let totalSynced = 0;
    const results = [];

    // Sync grades for each classroom
    for (const classroom of classrooms.classrooms) {
      try {
        const result = bulkSyncCourseGrades(classroom.id);
        results.push({
          courseId: classroom.id,
          courseName: classroom.name,
          result: result
        });

        if (result.success) {
          totalSynced += result.totalGradesSynced || 0;
        }

        // Rate limiting between courses
        Utilities.sleep(5000);

      } catch (error) {
        console.error(`Failed to sync grades for course ${classroom.id}:`, error);
        results.push({
          courseId: classroom.id,
          courseName: classroom.name,
          result: { success: false, error: error.message }
        });
      }
    }

    // Send summary to chat
    const message = `📊 Scheduled Grade Sync Complete\n\n` +
                   `Total Grades Synced: ${totalSynced}\n` +
                   `Courses Processed: ${results.length}\n` +
                   `Timestamp: ${new Date().toLocaleString()}`;

    sendMessage("Grade Sync Bot", message);

    console.log(`Scheduled sync complete: ${totalSynced} grades synced across ${results.length} courses`);

  } catch (error) {
    console.error('Scheduled grade sync failed:', error);
    sendMessage("Grade Sync Error", `❌ Scheduled grade sync failed: ${error.message}`);
  }
}