import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ConvexProvider } from "./app/providers/ConvexProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
