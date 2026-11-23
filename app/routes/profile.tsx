import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import AuthGuard from "~/components/auth/AuthGuard";
import Navbar from "~/components/layout/Navbar";
import Sidebar from "~/components/layout/Sidebar";
import Icon from "~/components/ui/Icon";
import { usePuterStore } from "~/services/puter/store";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";
import { formatSize } from "~/utils/formatSize";
import { safeJsonParse } from "~/utils/json";

export const meta = () => [
  { title: "User Profile & Preferences | Resumind" },
  { name: "description", content: "Manage your career profile, AI evaluation strictness, and storage metrics." },
];

function ProfileContent() {
  const { auth, kv, fs } = usePuterStore();
  const scheduleTimeout = useSafeTimeout();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const user = auth.user;
  const username = user?.username || "user";
  const userInitials = username.slice(0, 2).toUpperCase();
  const userUuid = user?.uuid || "anonymous";

  // Career Profile Form State
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [industry, setIndustry] = useState("Technology / Software");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("mid");

  // AI Preferences State
  const [evaluationStrictness, setEvaluationStrictness] = useState<EvaluationStrictness>("balanced");
  const [starTonePreference, setStarTonePreference] = useState<StarTonePreference>("impact");
  const [targetAtsScore, setTargetAtsScore] = useState<number>(85);

  // Cloud Storage Metrics State
  const [fileCount, setFileCount] = useState<number>(0);
  const [totalStorageBytes, setTotalStorageBytes] = useState<number>(0);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  // Load existing profile from Puter KV
  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      setLoadingProfile(true);
      try {
        const rawProfile = await kv.get(`user_profile:${userUuid}`);
        if (rawProfile && isMounted) {
          const parsed = safeJsonParse<UserProfile | null>(rawProfile, null);
          if (parsed) {
            if (parsed.displayName) setDisplayName(parsed.displayName);
            if (parsed.email) setEmail(parsed.email);
            if (parsed.targetRole) setTargetRole(parsed.targetRole);
            if (parsed.industry) setIndustry(parsed.industry);
            if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
            if (parsed.preferences) {
              if (parsed.preferences.evaluationStrictness) {
                setEvaluationStrictness(parsed.preferences.evaluationStrictness);
              }
              if (parsed.preferences.starTonePreference) {
                setStarTonePreference(parsed.preferences.starTonePreference);
              }
              if (typeof parsed.preferences.targetAtsScore === "number") {
                setTargetAtsScore(parsed.preferences.targetAtsScore);
              }
            }
          }
        }

        // Fetch Puter FS files to compute storage metrics
        const files = await fs.readDir("./");
        if (Array.isArray(files) && isMounted) {
          setFileCount(files.length);
          const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
          setTotalStorageBytes(totalBytes);
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, [kv, fs, userUuid]);

  // Handle Save Profile
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.uuid) {
      setSaveStatus({ text: "You must be signed in with a valid Puter account to save profile settings.", type: "error" });
      return;
    }
    setSaving(true);
    setSaveStatus(null);

    const profileData: UserProfile = {
      uuid: userUuid,
      username,
      displayName,
      email,
      targetRole,
      industry,
      experienceLevel,
      preferences: {
        evaluationStrictness,
        starTonePreference,
        targetAtsScore,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      const success = await kv.set(`user_profile:${userUuid}`, JSON.stringify(profileData));
      if (!isMountedRef.current) return;
      if (success !== false) {
        setSaveStatus({ text: "Profile saved successfully to Puter Cloud.", type: "success" });
      } else {
        setSaveStatus({ text: "Failed to persist profile to Puter KV.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      if (isMountedRef.current) {
        setSaveStatus({ text: "An error occurred while saving profile.", type: "error" });
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleCopyUuid = () => {
    navigator.clipboard?.writeText(userUuid);
    setCopiedUuid(true);
    scheduleTimeout(() => setCopiedUuid(false), 2000);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
  };

  const optionCardClass = (active: boolean) =>
    `flex cursor-pointer flex-col gap-1.5 border p-4 transition-colors ${
      active
        ? "border-cobalt bg-cobalt-wash text-ink"
        : "border-rule bg-paper text-ink-2 hover:border-rule-strong"
    }`;

  const sectionHeader = (index: string, title: string, copy: string) => (
    <div className="flex flex-col gap-3 border-b border-rule px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div>
        <h2 className="!text-[17px] !leading-snug !tracking-[-0.02em]">{title}</h2>
        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-3">{copy}</p>
      </div>
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-ink-4">{index}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* Status Message */}
          {saveStatus && (
            <div
              role="status"
              className={`mb-6 flex items-start justify-between gap-4 border-l-2 px-4 py-3 text-[13px] animate-fadeIn ${
                saveStatus.type === "success"
                  ? "border-forest bg-green-50 text-green-700"
                  : "border-rust bg-red-50 text-red-700"
              }`}
            >
              <span className="flex items-start gap-2.5">
                <Icon
                  name={saveStatus.type === "success" ? "check" : "alert"}
                  size={15}
                  className="mt-0.5 shrink-0"
                />
                {saveStatus.text}
              </span>
              <button
                type="button"
                onClick={() => setSaveStatus(null)}
                aria-label="Dismiss notification"
                className="shrink-0 p-1 text-ink-3 transition-colors hover:text-ink cursor-pointer"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          )}

          {/* Identity header */}
          <header className="flex flex-col gap-6 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[3px] bg-cobalt text-[17px] font-semibold text-paper">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="eyebrow">Account</p>
                <h1 className="mt-2 !text-[clamp(1.9rem,3.6vw,2.8rem)] !leading-none !tracking-[-0.04em]">
                  @{username}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                    Puter Cloud Connected
                  </span>
                  <span className="hidden h-3 w-px bg-rule sm:block" />
                  <span className="max-w-[220px] truncate font-mono text-[11px] text-ink-3 sm:max-w-xs">
                    {userUuid}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUuid}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cobalt transition-colors hover:text-cobalt-deep cursor-pointer"
                    title="Copy Puter UUID"
                  >
                    <Icon name="copy" size={12} />
                    {copiedUuid ? "Copied!" : "Copy UUID"}
                  </button>
                </div>
              </div>
            </div>

            <Link to="/dashboard" className="secondary-button w-fit !px-4 !py-2.5 text-[12px]">
              View Dashboard
              <Icon name="arrow-right" size={14} />
            </Link>
          </header>

          {/* Profile & Preferences Form */}
          <form onSubmit={handleSaveProfile} className="mt-8 !gap-6">
            {/* Career Profile Section */}
            <section className="border border-rule bg-surface">
              {sectionHeader(
                "01",
                "Career Profile",
                "Configure your professional background to customize AI evaluation benchmarks."
              )}
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div className="form-div">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full name or display name"
                  />
                </div>

                <div className="form-div">
                  <label htmlFor="email">Contact Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@company.com"
                  />
                </div>

                <div className="form-div">
                  <label htmlFor="targetRole">Target Job Role</label>
                  <input
                    id="targetRole"
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer"
                  />
                </div>

                <div className="form-div">
                  <label htmlFor="industry">Industry</label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="Technology / Software">Technology / Software</option>
                    <option value="Finance / Banking">Finance / Banking</option>
                    <option value="Healthcare / Biotech">Healthcare / Biotech</option>
                    <option value="Management Consulting">Management Consulting</option>
                    <option value="E-Commerce / Retail">E-Commerce / Retail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-div sm:col-span-2">
                  <label htmlFor="experienceLevel">Experience Level</label>
                  <select
                    id="experienceLevel"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                  >
                    <option value="entry">Entry-Level (0–2 years)</option>
                    <option value="mid">Mid-Level (3–5 years)</option>
                    <option value="senior">Senior (6–10 years)</option>
                    <option value="lead">Staff / Lead Engineer (10+ years)</option>
                    <option value="executive">Director / VP / Executive</option>
                  </select>
                </div>
              </div>
            </section>

            {/* AI Preferences Section */}
            <section className="border border-rule bg-surface">
              {sectionHeader(
                "02",
                "AI Analysis & Rewriting Preferences",
                "Calibrate how strictly Google Gemini 2.5 Flash evaluates and rewrites your resume."
              )}

              <div className="space-y-7 p-5 sm:p-6">
                {/* Evaluation Strictness */}
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[12px] font-semibold text-ink-2">Evaluation Strictness</p>
                    <p className="text-[10px] text-ink-4">Select one</p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className={optionCardClass(evaluationStrictness === "lenient")}>
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        <input
                          type="radio"
                          name="strictness"
                          value="lenient"
                          checked={evaluationStrictness === "lenient"}
                          onChange={() => setEvaluationStrictness("lenient")}
                        />
                        Lenient
                      </span>
                      <span className="text-[11px] leading-relaxed text-ink-3">
                        Encouraging tone with forgiving keyword thresholds.
                      </span>
                    </label>

                    <label className={optionCardClass(evaluationStrictness === "balanced")}>
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        <input
                          type="radio"
                          name="strictness"
                          value="balanced"
                          checked={evaluationStrictness === "balanced"}
                          onChange={() => setEvaluationStrictness("balanced")}
                        />
                        Balanced
                      </span>
                      <span className="text-[11px] leading-relaxed text-ink-3">
                        Standard corporate recruiter scrutiny (recommended).
                      </span>
                    </label>

                    <label className={optionCardClass(evaluationStrictness === "strict")}>
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        <input
                          type="radio"
                          name="strictness"
                          value="strict"
                          checked={evaluationStrictness === "strict"}
                          onChange={() => setEvaluationStrictness("strict")}
                        />
                        Strict (FAANG-grade)
                      </span>
                      <span className="text-[11px] leading-relaxed text-ink-3">
                        Demands measurable business ROI and zero fluff.
                      </span>
                    </label>
                  </div>
                </div>

                {/* STAR Tone Preference */}
                <div className="border-t border-rule pt-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[12px] font-semibold text-ink-2">Default STAR Rewriter Tone</p>
                    <p className="text-[10px] text-ink-4">Select one</p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className={optionCardClass(starTonePreference === "impact")}>
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        <input
                          type="radio"
                          name="starTone"
                          value="impact"
                          checked={starTonePreference === "impact"}
                          onChange={() => setStarTonePreference("impact")}
                        />
                        Impact &amp; ROI
                      </span>
                      <span className="text-[11px] leading-relaxed text-ink-3">
                        Highlights revenue, cost reduction, and user scale.
                      </span>
                    </label>

                    <label className={optionCardClass(starTonePreference === "technical")}>
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        <input
                          type="radio"
                          name="starTone"
                          value="technical"
                          checked={starTonePreference === "technical"}
                          onChange={() => setStarTonePreference("technical")}
                        />
                        Technical Depth
                      </span>
                      <span className="text-[11px] leading-relaxed text-ink-3">
                        Emphasizes architecture, latency, and systems design.
                      </span>
                    </label>

                    <label className={optionCardClass(starTonePreference === "executive")}>
                      <span className="flex items-center gap-2 text-[13px] font-semibold">
                        <input
                          type="radio"
                          name="starTone"
                          value="executive"
                          checked={starTonePreference === "executive"}
                          onChange={() => setStarTonePreference("executive")}
                        />
                        Executive Leadership
                      </span>
                      <span className="text-[11px] leading-relaxed text-ink-3">
                        Focuses on cross-functional alignment and roadmap delivery.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Target ATS Score Slider */}
                <div className="border-t border-rule pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="targetScore" className="text-[12px] font-semibold text-ink-2">
                      Target ATS Score Goal
                    </label>
                    <span
                      className="border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-blue-700"
                      data-testid="target-score-badge"
                    >
                      {targetAtsScore}/100
                    </span>
                  </div>
                  <input
                    id="targetScore"
                    type="range"
                    role="slider"
                    min="50"
                    max="100"
                    step="1"
                    value={targetAtsScore}
                    onChange={(e) => setTargetAtsScore(Number(e.target.value))}
                    className="mt-4 !border-0 !bg-transparent !p-0 accent-blue-600"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-ink-4">
                    <span>50 (Moderate)</span>
                    <span>75 (Good Baseline)</span>
                    <span>90+ (Top 5% Elite)</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Cloud Storage Metrics Section */}
            <section className="border border-rule bg-surface">
              {sectionHeader(
                "03",
                "Puter Cloud Storage Metrics",
                "Your uploaded PDF resumes and rendered page previews are isolated in your personal serverless Puter sandbox."
              )}
              <div className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-2">
                <div className="bg-paper p-5 sm:p-6">
                  <p className="text-[11px] font-medium text-ink-3">Uploaded files in cloud FS</p>
                  <p
                    className="mt-2 text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-ink"
                    data-testid="cloud-storage-files-count"
                  >
                    {fileCount} files
                  </p>
                </div>
                <div className="bg-paper p-5 sm:p-6">
                  <p className="text-[11px] font-medium text-ink-3">Estimated storage used</p>
                  <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-ink">
                    {formatSize(totalStorageBytes)}{" "}
                    <span className="text-[12px] font-normal text-ink-4">/ 500 MB free quota</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Form Submit Button */}
            <div className="flex flex-col-reverse items-stretch gap-4 border border-rule bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-[11px] leading-relaxed text-ink-4">
                {loadingProfile ? "Reading your saved profile…" : "Changes are saved to your Puter Cloud profile."}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="primary-button w-full cursor-pointer text-[12px] sm:w-auto"
              >
                {saving && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>

          {/* Danger Zone Section */}
          <section className="mt-8 border border-red-200 bg-red-50/60">
            <div className="border-b border-red-200 px-5 py-4 sm:px-6">
              <h3 className="text-[15px] font-semibold text-red-700">
                Account Session &amp; Danger Zone
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-red-700/80">
                Manage your Puter session and persistent application caches.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-[3px] border border-red-300 bg-paper px-4 py-2.5 text-[12px] font-semibold text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 cursor-pointer"
              >
                <Icon name="logout" size={14} />
                Sign Out of Puter
              </button>
              <Link
                to="/wipe"
                className="text-[11px] font-semibold text-red-700 underline underline-offset-2 transition-colors hover:text-red-900"
              >
                Wipe Cached Evaluations
              </Link>
            </div>
          </section>

          <p className="mt-6 text-[10px] leading-relaxed text-ink-4">
            Resumind never stores your resume in a central database. Files, previews, and profile
            preferences live in your own Puter Cloud account.
          </p>
        </main>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
