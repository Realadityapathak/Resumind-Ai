import { usePuterStore } from "~/services/puter/store";
import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { getSafeRedirect } from "~/utils/redirect";
import Icon from "~/components/ui/Icon";

export { getSafeRedirect };

export const meta = () => [
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your Resumind cloud account" },
];

export default function Auth() {
  const { isLoading, authStatus, auth, error, clearError } = usePuterStore();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const rawNext = searchParams.get("next");
  const safeNext = getSafeRedirect(rawNext, "/dashboard");

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(safeNext, { replace: true });
    }
  }, [auth.isAuthenticated, safeNext, navigate]);

  const isSigningIn = isLoading || authStatus === "checking";

  return (
    <main className="page-in min-h-screen bg-paper lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Editorial panel */}
      <section className="hidden border-r border-rule p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Link to="/" className="inline-flex w-fit items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-cobalt text-sm font-semibold text-paper">
            R
          </span>
          <span className="text-[17px] font-bold tracking-[-0.045em] text-ink">RESUMIND</span>
        </Link>

        <div className="max-w-xl">
          <p className="eyebrow">Private by default</p>
          <h1 className="mt-5 !text-[clamp(2.8rem,4.6vw,5rem)] !leading-[0.96] !tracking-[-0.05em] text-balance">
            Your resume is a private document. Treat it that way.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-ink-2">
            No central resume database. No password to lose. Your evaluations live in your own Puter
            Cloud sandbox and nowhere else.
          </p>

          <div className="mt-12 border-t border-rule">
            <div className="flex gap-3 border-b border-rule py-4">
              <Icon name="lock" size={17} className="mt-0.5 shrink-0 text-cobalt" />
              <div>
                <p className="text-[13px] font-semibold text-ink">1-click cloud auth</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  Protected by the Puter.js browser sandbox. No passwords stored here.
                </p>
              </div>
            </div>
            <div className="flex gap-3 border-b border-rule py-4">
              <Icon name="cloud" size={17} className="mt-0.5 shrink-0 text-cobalt" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Private KV and storage</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  Resumes, page previews, and scores stay inside your personal cloud.
                </p>
              </div>
            </div>
            <div className="flex gap-3 py-4">
              <Icon name="sparkle" size={17} className="mt-0.5 shrink-0 text-cobalt" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Gemini 2.5 Flash analysis</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  Multidimensional scoring, STAR rewrites, and keyword correlation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-ink-3">Google Gemini 2.5 Flash · Puter Cloud</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-cobalt text-sm font-semibold text-paper">
              R
            </span>
            <span className="text-[17px] font-bold tracking-[-0.045em] text-ink">RESUMIND</span>
          </Link>

          <div className="border border-rule bg-surface p-6 sm:p-8">
            <p className="eyebrow">Account</p>
            <h1 className="auth-title mt-3">Welcome to Your AI Career Suite</h1>
            <p className="mt-2 text-[13px] leading-[1.7] text-ink-3">
              Sign in with your serverless Puter cloud account to access your evaluations, ATS
              scores, and AI Copilot.
            </p>

            {error && (
              <div className="mt-5 flex items-start justify-between gap-3 border border-red-200 bg-red-50 p-3 text-[12px] leading-relaxed text-red-700">
                <span>{error}</span>
                <button
                  onClick={clearError}
                  className="shrink-0 text-red-600 hover:text-red-700 cursor-pointer"
                  aria-label="Dismiss error"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-rule pt-6">
              {isSigningIn ? (
                <button
                  disabled
                  className="auth-button opacity-75 cursor-wait"
                  data-testid="auth-loading-button"
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
                  <p>Connecting to Puter Cloud...</p>
                </button>
              ) : auth.isAuthenticated ? (
                <div className="flex flex-col gap-3">
                  <div className="border border-green-200 bg-green-50 p-3 text-center text-[12px] text-green-700">
                    Signed in as{" "}
                    <span className="font-semibold">{auth.user?.username || "Authenticated User"}</span>
                  </div>
                  <button
                    className="auth-button cursor-pointer"
                    onClick={() => navigate(safeNext, { replace: true })}
                  >
                    <p>Continue to Workspace →</p>
                  </button>
                  <button
                    type="button"
                    className="text-center text-[11px] text-ink-3 underline underline-offset-2 hover:text-ink cursor-pointer"
                    onClick={auth.signOut}
                  >
                    Sign Out / Switch Account
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="auth-button"
                    onClick={auth.signIn}
                    data-testid="auth-login-button"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.8 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                    <p>Sign In with Puter</p>
                  </button>

                  <div className="mt-5 grid gap-2 border-t border-rule pt-5">
                    <div className="flex items-center gap-2 text-[11px] text-ink-3">
                      <Icon name="lock" size={13} className="text-ink-4" />
                      No password to create or remember
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-ink-3">
                      <Icon name="cloud" size={13} className="text-ink-4" />
                      Files stay in your Puter account
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 border-t border-rule pt-4 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[11px] text-ink-3 transition-colors hover:text-cobalt"
              >
                <Icon name="arrow-left" size={12} />
                Back to Resumind Home
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-ink-4">
            Resumind uses Puter.js for authentication and storage. No resume content is sent to a
            central Resumind database.
          </p>
        </div>
      </section>
    </main>
  );
}
