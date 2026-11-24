import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  scrubPII,
  sanitizePayload,
  TelemetryService,
  telemetry,
  trackEvent,
  trackError,
  trackMetric,
} from "~/services/telemetry";

describe("PII-Safe Client Observability & Telemetry (app/services/telemetry.ts)", () => {
  let customTelemetry: TelemetryService;

  beforeEach(() => {
    telemetry.clearQueue();
    customTelemetry = new TelemetryService({ maxQueueSize: 5, enableConsole: false });
  });

  describe("scrubPII", () => {
    it("scrubs standard email addresses", () => {
      const input = "User email is john.doe@example.com and secondary contact is recruiter_99@sub.company.org.";
      const scrubbed = scrubPII(input);
      expect(scrubbed).not.toContain("john.doe@example.com");
      expect(scrubbed).not.toContain("recruiter_99@sub.company.org");
      expect(scrubbed).toContain("[EMAIL_REDACTED]");
    });

    it("scrubs US and international phone numbers", () => {
      const input = "Call me at (555) 123-4567 or +1-555-987-6543 or +44 7911 123456.";
      const scrubbed = scrubPII(input);
      expect(scrubbed).not.toContain("123-4567");
      expect(scrubbed).not.toContain("987-6543");
      expect(scrubbed).toContain("[PHONE_REDACTED]");
    });

    it("scrubs US Social Security Numbers formatted with dashes, spaces, or dots", () => {
      const input = "SSN is 000-12-3456 or 111 22 3333 or 444.55.6666 for background check.";
      const scrubbed = scrubPII(input);
      expect(scrubbed).not.toContain("000-12-3456");
      expect(scrubbed).not.toContain("111 22 3333");
      expect(scrubbed).not.toContain("444.55.6666");
      expect(scrubbed.match(/\[SSN_REDACTED\]/g)?.length).toBe(3);
    });

    it("scrubs 16-digit credit card numbers with dashes, spaces, or dots", () => {
      const input = "Cards: 4111-2222-3333-4444 and 5555.6666.7777.8888 on file.";
      const scrubbed = scrubPII(input);
      expect(scrubbed).not.toContain("4111-2222-3333-4444");
      expect(scrubbed).not.toContain("5555.6666.7777.8888");
      expect(scrubbed.match(/\[CARD_REDACTED\]/g)?.length).toBe(2);
    });

    it("handles non-string inputs safely", () => {
      expect(scrubPII(null as unknown as string)).toBe("");
      expect(scrubPII(undefined as unknown as string)).toBe("");
    });
  });

  describe("sanitizePayload", () => {
    it("redacts sensitive keys such as raw resume text, passwords, and tokens", () => {
      const payload = {
        resumeText: "Experienced software engineer with 10 years experience...",
        parsedText: "Extracted words here",
        apiKey: "puter_secret_token_12345",
        password: "mysecretpassword",
        userRole: "admin",
        resume: "Full raw resume content under candidate file",
        rawResume: "Unprocessed resume lines",
        cv: "Curriculum vitae data",
        resumeId: "resume-valid-id-12345",
        resumePath: "resumes/resume-123.pdf",
        resumeCount: 12,
      };

      const sanitized = sanitizePayload(payload) as Record<string, unknown>;
      expect(sanitized.resumeText).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.parsedText).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.apiKey).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.password).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.resume).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.rawResume).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.cv).toContain("[REDACTED_SENSITIVE_FIELD");
      expect(sanitized.userRole).toBe("admin");
      expect(sanitized.resumeId).toBe("resume-valid-id-12345");
      expect(sanitized.resumePath).toBe("resumes/resume-123.pdf");
      expect(sanitized.resumeCount).toBe(12);
    });

    it("redacts raw text blobs containing candidate resume sections (> 1000 chars)", () => {
      const resumeString = "Professional Summary: Experienced architect.\n" +
        "Work History and Experience:\n" +
        "Led engineering teams at scale.\n" +
        "Education:\n" +
        "BS in Computer Science.\n" +
        "Detailed background: ".repeat(60);
      expect(resumeString.length).toBeGreaterThan(1000);
      const sanitized = sanitizePayload(resumeString);
      expect(sanitized).toContain("[RESUME_TEXT_REDACTED");
    });

    it("redacts oversized raw string payloads that could be raw resume text", () => {
      const giantText = "A".repeat(3500);
      const sanitized = sanitizePayload(giantText);
      expect(sanitized).toBe("[RESUME_TEXT_REDACTED length=3500]");
    });

    it("recursively sanitizes nested objects and arrays with PII", () => {
      const payload = {
        users: [
          { email: "alice@test.com", phone: "555-123-4567" },
          { email: "bob@test.com", phone: "555-987-6543" },
        ],
        metadata: {
          submittedBy: "Contact dev@resumind.app for help",
        },
      };

      const sanitized = sanitizePayload(payload) as typeof payload;
      expect(sanitized.users[0].email).toBe("[EMAIL_REDACTED]");
      expect(sanitized.users[0].phone).toBe("[PHONE_REDACTED]");
      expect(sanitized.metadata.submittedBy).toContain("[EMAIL_REDACTED]");
    });

    it("preserves primitives like numbers, booleans, null, and undefined", () => {
      expect(sanitizePayload(42)).toBe(42);
      expect(sanitizePayload(true)).toBe(true);
      expect(sanitizePayload(null)).toBeNull();
      expect(sanitizePayload(undefined)).toBeUndefined();
    });

    it("sanitizes Error instances including nested cause", () => {
      const causeErr = new Error("Underlying network error at dev@resumind.app");
      const err = new Error("Failed connecting to db with secret_user@host.com", { cause: causeErr });
      const sanitized = sanitizePayload(err) as { name: string; message: string; cause?: { message: string } };
      expect(sanitized.name).toBe("Error");
      expect(sanitized.message).not.toContain("secret_user@host.com");
      expect(sanitized.message).toContain("[EMAIL_REDACTED]");
      expect(sanitized.cause?.message).not.toContain("dev@resumind.app");
      expect(sanitized.cause?.message).toContain("[EMAIL_REDACTED]");
    });
  });

  describe("TelemetryService Operations", () => {
    it("tracks events with sanitized properties and auto-generated metadata", () => {
      const event = customTelemetry.trackEvent("user_action", {
        contact: "support@domain.com",
        page: "/dashboard",
      });

      expect(event.id).toMatch(/^evt_\d+_/);
      expect(event.type).toBe("event");
      expect(event.name).toBe("user_action");
      expect(event.properties?.contact).toBe("[EMAIL_REDACTED]");
      expect(event.properties?.page).toBe("/dashboard");
      expect(customTelemetry.getQueue().length).toBe(1);
    });

    it("tracks errors with scrubbed message and context", () => {
      const err = new Error("Network timeout for user test@domain.com");
      const event = customTelemetry.trackError(err, { component: "Workspace" });

      expect(event.type).toBe("error");
      expect(event.error?.message).not.toContain("test@domain.com");
      expect(event.error?.message).toContain("[EMAIL_REDACTED]");
      expect(event.properties?.component).toBe("Workspace");
    });

    it("tracks metrics with values and tags", () => {
      const metric = customTelemetry.trackMetric("api_latency_ms", 145, { endpoint: "/api/chat" });
      expect(metric.type).toBe("metric");
      expect(metric.properties?.value).toBe(145);
      expect(metric.properties?.endpoint).toBe("/api/chat");
    });

    it("enforces max queue size by dropping oldest entries", () => {
      for (let i = 0; i < 7; i++) {
        customTelemetry.trackEvent(`event_${i}`);
      }
      const queue = customTelemetry.getQueue();
      expect(queue.length).toBe(5);
      expect(queue[0].name).toBe("event_2");
      expect(queue[4].name).toBe("event_6");
    });

    it("dispatches events via dispatch hook safely", () => {
      const hook = vi.fn();
      customTelemetry.setDispatchHook(hook);
      customTelemetry.trackEvent("test_dispatch");

      expect(hook).toHaveBeenCalledTimes(1);
      expect(hook.mock.calls[0][0].name).toBe("test_dispatch");
    });

    it("exports functional bindings that update global telemetry", () => {
      trackEvent("global_test", { info: "test" });
      expect(telemetry.getQueue().some((e) => e.name === "global_test")).toBe(true);

      trackError("string error");
      expect(telemetry.getQueue().some((e) => e.type === "error")).toBe(true);

      trackMetric("perf", 99);
      expect(telemetry.getQueue().some((e) => e.name === "perf")).toBe(true);
    });
  });
});
