import { type ReactNode, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

/**
 * Registers Clerk session JWT with the API client so /api/* requests
 * include Authorization: Bearer <token>. Required for brand/campaign saves.
 */
export function AuthTokenBridge({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return (await getToken()) || null;
      } catch {
        return null;
      }
    });
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return <>{children}</>;
}
