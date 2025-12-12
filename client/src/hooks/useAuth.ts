import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export function useAuth() {
  const { isLoaded, isSignedIn, userId, getToken } = useClerkAuth();

  return {
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    userId,
    getToken,
  };
}
