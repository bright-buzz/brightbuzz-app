import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Settings from "@/pages/settings";
import Saved from "@/pages/saved";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* "/" shows Landing when signed out, Home when signed in */}
      <Route path="/">
        {() => (
          <>
            <SignedOut>
              <Landing />
            </SignedOut>
            <SignedIn>
              <Home />
            </SignedIn>
          </>
        )}
      </Route>

      {/* Protected routes */}
      <Route path="/home">{() => <SignedIn><Home /></SignedIn>}</Route>
      <Route path="/settings">{() => <SignedIn><Settings /></SignedIn>}</Route>
      <Route path="/saved">{() => <SignedIn><Saved /></SignedIn>}</Route>

      {/* If signed out and they hit any other route, send to Clerk sign-in */}
      <Route>
        {() => (
          <>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
            <SignedIn>
              <NotFound />
            </SignedIn>
          </>
        )}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
