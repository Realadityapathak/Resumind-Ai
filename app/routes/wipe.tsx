import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import AuthGuard from "~/components/auth/AuthGuard";
import Navbar from "~/components/layout/Navbar";
import Icon from "~/components/ui/Icon";
import { usePuterStore } from "~/services/puter/store";
import { telemetry } from "~/services/telemetry";

export const meta = () => [
  { title: "Wipe App Data | Resumind" },
  { name: "description", content: "Clear cached Resumind files and evaluations from your Puter Cloud account." },
];

function WipeContent() {
    const { auth, isLoading, puterReady, error, clearError, fs, kv } = usePuterStore();
    const isMountedRef = useRef(true);
    const [files, setFiles] = useState<FSItem[]>([]);
    const [isWiping, setIsWiping] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [wipingStatus, setWipingStatus] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadFiles = async () => {
        try {
            const result = (await fs.readDir("./")) as FSItem[] | undefined;
            if (isMountedRef.current) {
                setFiles(result || []);
            }
        } catch (err) {
            console.error("Failed to read directory:", err);
            if (isMountedRef.current) {
                setFiles([]);
            }
        }
    };

    useEffect(() => {
        if (!puterReady || isLoading || !auth.isAuthenticated) return;
        loadFiles();
    }, [puterReady, isLoading, auth.isAuthenticated]);

    const handleDelete = async () => {
        if (isWiping || !confirmed) return;
        setIsWiping(true);
        setWipingStatus("Deleting cloud files and clearing evaluation store…");
        try {
            if (files.length > 0) {
                const results = await Promise.allSettled(
                    files.map((file) => fs.delete(file.path || file.name))
                );
                const hasFailures = results.some((r) => r.status === "rejected");
                if (hasFailures) {
                    throw new Error("One or more files failed to delete from Puter storage.");
                }
            }
            await kv.flush();
            await loadFiles();
            if (isMountedRef.current) {
                setConfirmed(false);
                setWipingStatus("All app data has been successfully wiped.");
            }
        } catch (err) {
            console.error("Failed to wipe files or KV store:", err);
            telemetry.trackError(err, { context: "wipe_app_data" });
            if (isMountedRef.current) {
                setWipingStatus("Error occurred while wiping data. Please try again.");
            }
        } finally {
            if (isMountedRef.current) {
                setIsWiping(false);
            }
        }
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper px-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-cobalt" />
                    <p className="text-[13px] font-medium text-ink-2">Loading your cloud session…</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-paper px-6">
                <div className="w-full max-w-md border border-red-200 bg-surface p-6">
                    <span className="flex h-9 w-9 items-center justify-center border border-red-200 bg-red-50 text-rust">
                        <Icon name="alert" size={16} />
                    </span>
                    <h1 className="mt-5 text-[19px] font-semibold text-ink">Could not open cloud session</h1>
                    <p className="mt-2 break-words text-[12px] leading-relaxed text-ink-3">{error}</p>
                    <button
                        type="button"
                        onClick={clearError}
                        className="secondary-button mt-5 !px-4 !py-2.5 text-[12px]"
                    >
                        Dismiss error
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-paper">
            <Navbar />

            <div className="mx-auto w-full max-w-[760px] px-5 py-12 sm:px-8 sm:py-16">
                <p className="eyebrow">Maintenance</p>
                <h1 className="mt-4 !text-[clamp(2.2rem,5vw,3.4rem)] !leading-[1.02] !tracking-[-0.045em]">
                    Wipe app data
                </h1>
                <p className="mt-4 max-w-xl text-[14px] leading-[1.75] text-ink-3">
                    Remove every cached file and evaluation from your Puter Cloud account. This is
                    permanent and cannot be undone.
                </p>

                <div className="mt-8 border border-rule bg-surface">
                    <div className="flex flex-col gap-2 border-b border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[12px] font-semibold text-ink">
                                Authenticated as @{auth.user?.username}
                            </p>
                            <p className="mt-0.5 text-[11px] text-ink-3">
                                Signed in to your Puter Cloud account
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                            Connected
                        </span>
                    </div>

                    <div className="px-5 py-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium text-ink-3">Existing files</p>
                            <p className="text-[11px] tabular-nums text-ink-4">{files.length} total</p>
                        </div>

                        {files.length === 0 ? (
                            <p className="mt-4 border border-rule bg-paper px-4 py-6 text-center text-[12px] text-ink-3">
                                No cached files in this account.
                            </p>
                        ) : (
                            <ul className="mt-3 divide-y divide-rule border border-rule bg-paper">
                                {files.map((file) => (
                                    <li key={file.id} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <Icon name="file" size={14} className="shrink-0 text-ink-4" />
                                        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">
                                            {file.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-5 border-t border-rule pt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="confirm-wipe-checkbox"
                                    name="confirmWipe"
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    disabled={isWiping}
                                    className="mt-0.5 h-4 w-4 rounded border-rule text-rust focus:ring-rust cursor-pointer"
                                />
                                <span className="text-[12px] font-medium leading-relaxed text-ink select-none">
                                    I understand that this action is irreversible and will permanently delete all uploaded resumes, evaluations, and files.
                                </span>
                            </label>
                        </div>

                        {wipingStatus && (
                            <div
                                role="status"
                                className={`mt-4 rounded-[3px] border px-3.5 py-2.5 text-[12px] ${
                                    wipingStatus.includes("Error")
                                        ? "border-red-200 bg-red-50 text-rust"
                                        : wipingStatus.includes("successfully")
                                        ? "border-green-200 bg-green-50 text-green-700"
                                        : "border-rule bg-surface-2 text-ink-2"
                                }`}
                            >
                                {wipingStatus}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] leading-relaxed text-ink-4">
                            This clears both cloud files and the evaluation store.
                        </p>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/profile"
                                className="secondary-button !px-4 !py-2.5 text-[12px]"
                            >
                                Cancel
                            </Link>
                            <button
                                type="button"
                                onClick={() => handleDelete()}
                                disabled={isWiping || !confirmed}
                                className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-rust bg-rust px-4 py-2.5 text-[12px] font-semibold text-paper transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Icon name="trash" size={14} />
                                {isWiping ? "Wiping…" : "Wipe App Data"}
                            </button>
                        </div>
                    </div>
                </div>

                <Link
                    to="/profile"
                    className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:text-cobalt"
                >
                    <Icon name="arrow-left" size={12} />
                    Back to profile
                </Link>
            </div>
        </main>
    );
}

export default function WipeApp() {
    return (
        <AuthGuard>
            <WipeContent />
        </AuthGuard>
    );
}
