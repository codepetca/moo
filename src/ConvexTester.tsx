import { useState } from "react";

interface ConvexTesterProps {
  convexUrl?: string;
}

export function ConvexTester({ convexUrl: propUrl }: ConvexTesterProps) {
  const [convexUrl, setConvexUrl] = useState(propUrl || "https://rapid-nightingale-951.convex.cloud");
  const [testUser, setTestUser] = useState("External Tester");
  const [testMessage, setTestMessage] = useState("Hello from external app!");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const testSendMessage = async () => {
    setIsLoading(true);
    setResponse("");

    try {
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
    } catch (error: any) {
      setResponse(`❌ Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetMessages = async () => {
    setIsLoading(true);
    setResponse("");

    try {
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
    } catch (error: any) {
      setResponse(`❌ Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWikiCommand = async () => {
    setIsLoading(true);
    setResponse("");

    try {
      const response = await fetch(`${convexUrl}/api/mutation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: "chat:sendMessage",
          args: {
            user: testUser,
            body: "/wiki React"
          },
          format: "json"
        })
      });

      if (response.ok) {
        const result = await response.json();
        setResponse(`✅ Success! Wiki command triggered. This should fetch a Wikipedia summary about React. Response: ${JSON.stringify(result)}`);
      } else {
        const error = await response.text();
        setResponse(`❌ Error: ${response.status} - ${error}`);
      }
    } catch (error: any) {
      setResponse(`❌ Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '600px',
      margin: '20px auto',
      padding: '20px',
      border: '2px solid #f35d1c',
      borderRadius: '12px',
      backgroundColor: '#f9fafb'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#f35d1c' }}>
        🧪 Convex Backend Tester
      </h2>

      <p style={{ marginBottom: '20px', color: '#6b7280' }}>
        Test external HTTP calls to your Convex backend. This simulates how external applications
        (like Google Apps Script) would interact with your Convex functions.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          Convex URL:
        </label>
        <input
          value={convexUrl}
          onChange={(e) => setConvexUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
          placeholder="https://your-deployment.convex.cloud"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          Test User:
        </label>
        <input
          value={testUser}
          onChange={(e) => setTestUser(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
          Test Message:
        </label>
        <input
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={testSendMessage}
          disabled={isLoading}
          style={{
            padding: '12px 16px',
            backgroundColor: '#f35d1c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳' : '📤'} Send Message
        </button>

        <button
          onClick={testGetMessages}
          disabled={isLoading}
          style={{
            padding: '12px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳' : '📥'} Get Messages
        </button>

        <button
          onClick={testWikiCommand}
          disabled={isLoading}
          style={{
            padding: '12px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳' : '📚'} Test Wiki
        </button>
      </div>

      {response && (
        <div style={{
          padding: '16px',
          backgroundColor: response.startsWith('✅') ? '#d1fae5' : '#fee2e2',
          color: response.startsWith('✅') ? '#065f46' : '#991b1b',
          borderRadius: '8px',
          fontSize: '14px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}>
          {response}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>
          📋 Example curl commands:
        </h4>
        <pre style={{
          fontSize: '12px',
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          padding: '12px',
          borderRadius: '6px',
          overflow: 'auto',
          margin: '0'
        }}>
{`# Send a message
curl ${convexUrl}/api/mutation \\
  -H "Content-Type: application/json" \\
  -d '{"path": "chat:sendMessage", "args": {"user": "${testUser}", "body": "${testMessage}"}, "format": "json"}'

# Get messages
curl ${convexUrl}/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"path": "chat:getMessages", "args": {}, "format": "json"}'`}
        </pre>
      </div>
    </div>
  );
}

export default ConvexTester;