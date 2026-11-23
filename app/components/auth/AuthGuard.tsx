import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePuterStore } from "~/services/puter/store";

export interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, fallback, redirectTo }: AuthGuardProps) {
  const { authStatus, puterReady, puterLoadFailed, isLoading, auth } = usePuterStore();
  const location = useLocation();
  const navigate = useNavigate();

  // True while Puter CDN is loading, store is idle, or auth check is actively in progress.
  // A failed CDN load is terminal: stop checking so the user reaches /auth and sees the error.
  const isChecking =
    authStatus === "checking" ||
    authStatus === "idle" ||
    (!puterReady && !puterLoadFailed) ||
    (isLoading && !auth.isAuthenticated);

  useEffect(() => {
    // Only redirect once checking is definitively finished and user is confirmed unauthenticated
    if (!isChecking && (authStatus === "unauthenticated" || !auth.isAuthenticated)) {
      const currentPath = location.pathname + location.search + location.hash;
      const destination = redirectTo || `/auth?next=${encodeURIComponent(currentPath)}`;
      navigate(destination, { replace: true });
    }
  }, [
    isChecking,
    authStatus,
    auth.isAuthenticated,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    redirectTo,
  ]);

  // Render branded loading skeleton during check
  if (isChecking) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div
        className="min-h-screen bg-paper flex flex-col items-center justify-center p-6"
        data-testid="auth-guard-loading"
      >
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10">
            <span className="w-8 h-8 rounded-[3px] bg-cobalt text-paper flex items-center justify-center font-semibold text-sm">
              R
            </span>
            <span className="text-[15px] font-bold tracking-[-0.045em] text-ink">RESUMIND</span>
          </div>

          <div className="border-t border-rule pt-7 animate-pulse">
            <p className="eyebrow mb-3">Session check</p>
            <h1 className="!text-2xl !tracking-[-0.03em] font-semibold">Verifying Resumind Session</h1>
            <p className="text-[13px] leading-relaxed text-ink-3 mt-2">
              Connecting to your private Puter Cloud workspace.
            </p>

            <div className="mt-7 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-rule border-t-cobalt animate-spin" />
              <span className="text-[12px] text-ink-3">Secure connection in progress</span>
            </div>

            <div className="mt-5 h-px bg-rule overflow-hidden">
              <div className="h-full w-2/3 bg-cobalt animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated and redirect is in flight, prevent flash of protected content
  if (!auth.isAuthenticated || authStatus !== "authenticated") {
    return null;
  }

  // Seamlessly render protected children
  return <>{children}</>;
}

export default AuthGuard;
