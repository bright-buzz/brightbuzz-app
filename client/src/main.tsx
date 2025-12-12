import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkProvider } from "@clerk/clerk-react";

createRoot(document.getElementById("root")!).render(
<ClerkProvider
  publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
  afterSignInUrl="/home"
  afterSignUpUrl="/home"
>
  <App />
</ClerkProvider>
);
