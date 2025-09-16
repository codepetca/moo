# External API Testing Guide

This guide explains how to test external API calls to your Convex backend, simulating how external applications (like Google Apps Script) would interact with your Convex functions.

## Setup Overview

Your Convex chat application now includes:

1. **Original Chat Interface** - The standard Convex React app with real-time updates
2. **Built-in API Tester** - Click "Show API Tester" to test external HTTP calls
3. **Standalone Tester Component** - `ConvexTester.tsx` for embedding in other apps

## Available Endpoints

Your Convex deployment URL: `https://rapid-nightingale-951.convex.cloud`

### Available Functions:
- `chat:getMessages` (query) - Retrieves the last 50 messages
- `chat:sendMessage` (mutation) - Sends a new message
- `chat:getWikipediaSummary` (internal action) - Fetches Wikipedia content (triggered by `/wiki` commands)

## Testing Methods

### 1. Using the Built-in Web Tester

1. Start your development server: `npm run dev`
2. Open http://localhost:5174/
3. Click "Show API Tester" in the header
4. Test sending messages and retrieving data

### 2. Using curl Commands

```bash
# Send a message
curl https://rapid-nightingale-951.convex.cloud/api/mutation \
  -H "Content-Type: application/json" \
  -d '{"path": "chat:sendMessage", "args": {"user": "External User", "body": "Hello from curl!"}, "format": "json"}'

# Get messages
curl https://rapid-nightingale-951.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -d '{"path": "chat:getMessages", "args": {}, "format": "json"}'

# Trigger Wikipedia lookup
curl https://rapid-nightingale-951.convex.cloud/api/mutation \
  -H "Content-Type: application/json" \
  -d '{"path": "chat:sendMessage", "args": {"user": "Bot", "body": "/wiki React"}, "format": "json"}'
```

### 3. Google Apps Script Example

```javascript
function testConvexAPI() {
  const CONVEX_URL = "https://rapid-nightingale-951.convex.cloud";

  // Send a message
  const response = UrlFetchApp.fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      path: "chat:sendMessage",
      args: {
        user: "Google Apps Script",
        body: "Hello from GAS!"
      },
      format: "json"
    })
  });

  console.log(response.getContentText());
}
```

### 4. JavaScript/Fetch Example

```javascript
const CONVEX_URL = "https://rapid-nightingale-951.convex.cloud";

// Send a message
async function sendMessage(user, message) {
  const response = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: "chat:sendMessage",
      args: { user, body: message },
      format: "json"
    })
  });

  return response.json();
}

// Get messages
async function getMessages() {
  const response = await fetch(`${CONVEX_URL}/api/query`, {
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

  return response.json();
}

// Usage
sendMessage("External App", "Hello from external JavaScript!");
getMessages().then(messages => console.log(messages));
```

## Testing Scenarios

### 1. Basic Message Exchange
- Send a message from the external tester
- Verify it appears in the main chat interface
- Send a response from the main interface
- Retrieve messages via the external API

### 2. Wikipedia Integration
- Send a message starting with `/wiki` followed by a topic
- Example: `/wiki JavaScript`
- The system will automatically fetch and post a Wikipedia summary

### 3. Real-time vs HTTP API Comparison
- The main React interface uses real-time subscriptions (useQuery/useMutation)
- External calls use direct HTTP API requests
- Both interact with the same backend data

## CORS Considerations

- Convex HTTP API endpoints handle CORS automatically for most use cases
- For browser-based external apps, ensure your domain is properly configured
- Server-to-server calls (like Apps Script) don't require CORS

## Error Handling

Common error responses:
- `400` - Invalid request format or missing parameters
- `404` - Function not found
- `500` - Server error

Always check the response status and handle errors appropriately in your external applications.

## Monitoring

- Check the [Convex Dashboard](https://dashboard.convex.dev/d/rapid-nightingale-951) to monitor API calls
- View logs and performance metrics
- Track function execution and errors

## Next Steps

1. Test with your actual external application (Google Apps Script, etc.)
2. Implement proper error handling and retry logic
3. Consider adding authentication if needed for production use
4. Monitor usage and performance through the Convex dashboard