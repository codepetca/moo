# Google Apps Script Integration

This folder contains Google Apps Script code to interact with your Convex chat backend.

## Setup Instructions

1. **Create a new Apps Script project:**
   - Go to [script.google.com](https://script.google.com)
   - Click "New Project"
   - Give it a name like "Convex Chat Tester"

2. **Copy the code:**
   - Replace the default `Code.gs` content with the code from `Code.gs` in this folder
   - If needed, also update the `appsscript.json` manifest

3. **Update the configuration:**
   - In `Code.gs`, update the `CONVEX_URL` constant with your deployment URL:
   ```javascript
   const CONVEX_URL = "https://rapid-nightingale-951.convex.cloud";
   ```

4. **Save and test:**
   - Save the project (Ctrl+S or Cmd+S)
   - Select a function to run from the dropdown
   - Click the "Run" button

## Available Functions

### Quick Test Functions

- **`testSendMessage()`** - Sends a simple test message
- **`showLatestMessages()`** - Retrieves and displays recent messages
- **`testWikipediaLookup()`** - Tests the `/wiki` command functionality

### Core Functions

- **`sendMessage(user, message)`** - Core function to send messages
- **`getMessages()`** - Retrieves all messages from the chat

### Advanced Functions

- **`sendMultipleTestMessages()`** - Sends several test messages with delays
- **`runAllTests()`** - Comprehensive test suite
- **`sendScheduledMessage()`** - For use with time-based triggers

### Google Classroom Integration Functions

- **`listClassroomsAndSend()`** - Lists unarchived Google Classrooms where user is a teacher and sends to chat
- **`testClassroomConnection()`** - Tests Classroom API connectivity
- **`getUnarchivedClassrooms()`** - Helper function to retrieve active courses where user is teacher/owner

## First Time Setup

1. Run `testSendMessage()` first to verify the connection works
2. Check your React app at http://localhost:5174/ to see the message appear
3. Run `showLatestMessages()` to verify you can read data back

## Google Classroom Setup

To use the Classroom integration functions:

1. **Enable Google Classroom API:**
   - The `appsscript.json` manifest already includes the necessary configuration
   - When you first run a Classroom function, you'll be prompted to authorize permissions

2. **Test the connection:**
   - Run `testClassroomConnection()` first to verify API access
   - This will send a test message to your chat confirming the connection

3. **List your teaching classrooms:**
   - Run `listClassroomsAndSend()` to get your active Google Classrooms where you are a teacher
   - Only classrooms where you are the teacher/owner will be listed
   - The classroom names will be posted to your Convex chat

**Requirements:**
- Google for Education account or consumer account with Classroom access
- Access to Google Classrooms as a teacher (courses where you are student-only won't appear)
- OAuth permission for `https://www.googleapis.com/auth/classroom.courses.readonly`

## Setting Up Automated Messages

To send messages on a schedule:

1. Run the `sendScheduledMessage()` function manually first to test
2. Go to "Triggers" in the Apps Script editor (clock icon)
3. Click "Add Trigger"
4. Choose `sendScheduledMessage` as the function
5. Set your desired time-based trigger (hourly, daily, etc.)

## Error Handling

- All functions include try-catch blocks for error handling
- Check the Apps Script logs for detailed error messages
- Verify your `CONVEX_URL` is correct if you get connection errors

## Example Usage

```javascript
// Send a simple message
testSendMessage();

// Send a custom message
sendMessage("My Bot", "Hello from my custom bot!");

// Get and log all messages
const messages = getMessages();
console.log(messages);

// Trigger a Wikipedia lookup
sendMessage("Bot", "/wiki JavaScript");
```

## Web App Deployment

The project now includes a web application interface for setting up autograding:

### Deploying as Web App

1. **Open Apps Script Editor**: https://script.google.com/d/1KT1kNn4nYGqmRX3HYSX1Db2CB8z9pbbA30dcAuq8WLntmLaylixDVG3r/edit

2. **Deploy as Web App**:
   - Click "Deploy" → "New Deployment"
   - Choose type: "Web App"
   - Description: "Convex Autograding Setup"
   - Execute as: "Me"
   - Who has access: "Anyone with Google account"
   - Click "Deploy"

3. **Copy Web App URL**: Save the provided web app URL for accessing the interface

### Using the Web App

The web app provides a step-by-step interface to:

1. **Select Classroom**: Choose from your Google Classrooms where you're a teacher
2. **Select Assignment**: Pick a Google Forms assignment from the selected classroom
3. **Configure Grading**: Review form questions and set point values
4. **Deploy Configuration**: Send the setup to your Convex backend

### Web App Features

- **Real-time Loading**: Dynamic loading of classrooms and assignments
- **Form Analysis**: Automatic extraction of Google Forms structure
- **Error Handling**: Comprehensive error messages and validation
- **Responsive Design**: Works on desktop and mobile devices
- **Progress Tracking**: Clear step-by-step workflow

### Current Deployment

- **Latest Version**: @5 - Phase 2: Webapp interface with Google Classroom and Forms integration
- **Deployment ID**: `AKfycby__zJSKAKW_zX-ToSZxChot2VChU9u7_AUB1nKbRJuxYfiM5tbkXJweKPqy08J9ncmPg`

## Integration Ideas

- **Automated Grading**: Students submit forms → Auto-grading → Grades sync to Classroom
- **Real-time Dashboard**: React interface showing live submission status
- **Grade Analytics**: Performance reports and class insights
- **Multi-form Support**: Handle multiple quizzes per classroom
- **Bulk Operations**: Batch configure multiple assignments