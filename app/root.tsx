import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./styles/global.css";
import { useEffect } from "react";

import { usePuterStore } from "~/services/puter/store";
import { telemetry } from "~/services/telemetry";
import Icon from "~/components/ui/Icon";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { init } = usePuterStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.puter.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' blob: https://js.puter.com https://puter.com https://*.puter.com https://api.puter.com; frame-src 'self' https://js.puter.com https://puter.com https://*.puter.com; worker-src 'self' blob:;"
        />
        <Meta />
        <Links />
        {/* Gate load/reveal motion on JS so the page is never hidden without it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js');",
          }}
        />
      </head>
      <body>
        <script src="https://js.puter.com/v2/"></script>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown; params?: Record<string, string | undefined> }) {
  let statusBadge = "System Error";
  let message = "Something Went Wrong";
  let details = "An unexpected application error occurred while processing your request.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      statusBadge = "404 Not Found";
      message = "Page Not Found";
      details = "The page you are looking for does not exist or may have been moved.";
    } else {
      statusBadge = `HTTP ${error.status}`;
      message = error.statusText || "Application Error";
      details =
        typeof error.data === "string"
          ? error.data
          : error.data?.message || error.statusText || details;
    }
  } else if (error instanceof Error) {
    statusBadge = error.name || "Exception";
    message = "Something Went Wrong";
    details = error.message || details;
    if (import.meta.env.DEV) {
      stack = error.stack;
    }
  } else if (typeof error === "string") {
    details = error;
  } else if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    details = (error as any).message;
    if ("name" in error && typeof (error as any).name === "string") {
      statusBadge = (error as any).name;
    }
  }

  useEffect(() => {
    telemetry.trackError(error, {
      boundary: "RootErrorBoundary",
      statusBadge,
      message,
      details,
    });
  }, [error, statusBadge, message, details]);

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main
      className="flex min-h-[85vh] items-center justify-center bg-paper px-4 py-12 sm:px-6 lg:px-8"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-lg border border-rule bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-red-200 bg-red-50 text-rust">
            <Icon name="alert" size={20} />
          </div>
          <span className="rounded-[3px] border border-rule bg-surface-2 px-2.5 py-1 text-[11px] font-mono font-medium tracking-wide text-ink-3 uppercase">
            {statusBadge}
          </span>
        </div>

        <p className="eyebrow mt-6 text-rust">Resumind Recovery</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {message}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-3">
          {details}
        </p>

        {stack && import.meta.env.DEV && (
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-xs font-medium text-ink-3 hover:text-ink">
              View error stack trace
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-[3px] border border-rule bg-surface-2 p-3 font-mono text-[11px] leading-tight text-ink-2">
              <code>{stack}</code>
            </pre>
          </details>
        )}

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link
            to="/dashboard"
            className="primary-button text-center"
          >
            Return to Dashboard
          </Link>
          <button
            type="button"
            onClick={handleReload}
            className="secondary-button text-center"
          >
            Reload Application
          </button>
          <Link
            to="/"
            className="secondary-button text-center"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
