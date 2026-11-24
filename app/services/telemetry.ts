/**
 * PII-Safe Client Telemetry & Observability Service
 *
 * Implements rigorous redaction of Personally Identifiable Information (PII)
 * including email addresses, phone numbers, SSNs, credit card patterns, and
 * full candidate resume text before logging or queuing events for delivery.
 */

// Regular expressions for detecting and redacting sensitive PII patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const US_PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const INTL_PHONE_REGEX = /\+?\b\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}\b/g;
const SSN_REGEX = /\b\d{3}[-\s.]\d{2}[-\s.]\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s.]?){3}\d{4}\b/g;

// Keys commonly containing raw resume or full candidate document text
const SENSITIVE_KEY_PATTERNS = [
  /^resume$/i,
  /resume.*(text|content|body|raw|data|blob|string)/i,
  /(raw|full|parsed|extracted|candidate).*resume/i,
  /^cv$/i,
  /cv.*(text|content|body)/i,
  /(raw|full).*cv/i,
  /parsed.*text/i,
  /raw.*text/i,
  /file.*content/i,
  /document.*content/i,
  /extracted.*text/i,
  /candidate.*(text|info|details|bio)/i,
  /^text$/i,
  /bio/i,
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth.*header/i,
  /bearer/i,
];

/**
 * Scrubs known PII patterns from freeform text strings.
 */
export function scrubPII(text: string): string {
  if (typeof text !== "string") return "";

  return text
    .replace(EMAIL_REGEX, "[EMAIL_REDACTED]")
    .replace(SSN_REGEX, "[SSN_REDACTED]")
    .replace(CREDIT_CARD_REGEX, "[CARD_REDACTED]")
    .replace(US_PHONE_REGEX, "[PHONE_REDACTED]")
    .replace(INTL_PHONE_REGEX, (match) => {
      // Avoid false positive on simple years or short numbers
      const digitsOnly = match.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        return "[PHONE_REDACTED]";
      }
      return match;
    });
}

/**
 * Recursively sanitizes data payloads, redacting sensitive keys and scrubbing PII.
 */
export function sanitizePayload<T>(payload: T, depth = 0): T {
  // Prevent circular references and stack overflow
  if (depth > 6) return "[MAX_DEPTH_REACHED]" as unknown as T;

  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === "string") {
    // Large raw text blobs that might be an entire extracted resume (> 3000 chars)
    if (payload.length > 3000) {
      return `[RESUME_TEXT_REDACTED length=${payload.length}]` as unknown as T;
    }
    // Also redact strings that look like full resumes (> 1000 chars with standard resume section headers)
    if (
      payload.length > 1000 &&
      /\b(experience|work history|employment|education|skills|certifications)\b/i.test(payload) &&
      /\b(summary|objective|responsibilities|achievements|projects)\b/i.test(payload)
    ) {
      return `[RESUME_TEXT_REDACTED length=${payload.length}]` as unknown as T;
    }
    return scrubPII(payload) as unknown as T;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return payload;
  }

  if (payload instanceof Error) {
    return {
      name: payload.name,
      message: scrubPII(payload.message),
      stack: payload.stack ? scrubPII(payload.stack) : undefined,
      cause: (payload as any).cause ? sanitizePayload((payload as any).cause, depth + 1) : undefined,
    } as unknown as T;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, depth + 1)) as unknown as T;
  }

  if (typeof payload === "object") {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

      if (isSensitiveKey) {
        if (typeof value === "string") {
          sanitizedObj[key] = `[REDACTED_SENSITIVE_FIELD length=${value.length}]`;
        } else {
          sanitizedObj[key] = "[REDACTED_SENSITIVE_FIELD]";
        }
      } else {
        sanitizedObj[key] = sanitizePayload(value, depth + 1);
      }
    }

    return sanitizedObj as T;
  }

  return payload;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: "event" | "error" | "metric";
  name: string;
  properties?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface TelemetryOptions {
  maxQueueSize?: number;
  dispatchHook?: (event: TelemetryEvent) => void;
  enableConsole?: boolean;
}

export class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private maxQueueSize: number;
  private dispatchHook?: (event: TelemetryEvent) => void;
  private enableConsole: boolean;

  constructor(options?: TelemetryOptions) {
    this.maxQueueSize = options?.maxQueueSize ?? 100;
    this.dispatchHook = options?.dispatchHook;
    this.enableConsole = options?.enableConsole ?? (typeof process !== "undefined" && process.env?.NODE_ENV !== "test");
  }

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  public trackEvent(name: string, properties?: Record<string, unknown>): TelemetryEvent {
    const sanitizedProps = properties ? (sanitizePayload(properties) as Record<string, unknown>) : undefined;
    const event: TelemetryEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: "event",
      name: scrubPII(name),
      properties: sanitizedProps,
    };

    this.enqueue(event);
    return event;
  }

  public trackError(err: unknown, context?: Record<string, unknown>): TelemetryEvent {
    let errorDetails: { name: string; message: string; stack?: string };

    if (err instanceof Error) {
      errorDetails = {
        name: err.name || "Error",
        message: scrubPII(err.message),
        stack: err.stack ? scrubPII(err.stack) : undefined,
      };
    } else if (typeof err === "string") {
      errorDetails = {
        name: "Error",
        message: scrubPII(err),
      };
    } else if (err && typeof err === "object") {
      const errObj = err as Record<string, unknown>;
      errorDetails = {
        name: typeof errObj.name === "string" ? scrubPII(errObj.name) : "Error",
        message: typeof errObj.message === "string" ? scrubPII(errObj.message) : JSON.stringify(sanitizePayload(errObj)),
        stack: typeof errObj.stack === "string" ? scrubPII(errObj.stack) : undefined,
      };
    } else {
      errorDetails = {
        name: "UnknownError",
        message: scrubPII(String(err)),
      };
    }

    const sanitizedContext = context ? (sanitizePayload(context) as Record<string, unknown>) : undefined;
    const event: TelemetryEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: "error",
      name: `error:${errorDetails.name}`,
      properties: sanitizedContext,
      error: errorDetails,
    };

    this.enqueue(event);
    return event;
  }

  public trackMetric(name: string, value: number, tags?: Record<string, string>): TelemetryEvent {
    const sanitizedTags = tags ? (sanitizePayload(tags) as Record<string, unknown>) : undefined;
    const event: TelemetryEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: "metric",
      name: scrubPII(name),
      properties: {
        value,
        ...sanitizedTags,
      },
    };

    this.enqueue(event);
    return event;
  }

  private enqueue(event: TelemetryEvent): void {
    this.queue.push(event);
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }

    if (this.dispatchHook) {
      try {
        this.dispatchHook(event);
      } catch {
        // Suppress dispatch hook failure to guarantee stability
      }
    }

    if (this.enableConsole) {
      if (event.type === "error") {
        console.warn(`[Telemetry:${event.type}]`, event.name, event.error, event.properties);
      } else {
        console.info(`[Telemetry:${event.type}]`, event.name, event.properties);
      }
    }
  }

  public getQueue(): readonly TelemetryEvent[] {
    return [...this.queue];
  }

  public clearQueue(): void {
    this.queue = [];
  }

  public setDispatchHook(hook: (event: TelemetryEvent) => void): void {
    this.dispatchHook = hook;
  }
}

export const telemetry = new TelemetryService();
export const trackEvent = telemetry.trackEvent.bind(telemetry);
export const trackError = telemetry.trackError.bind(telemetry);
export const trackMetric = telemetry.trackMetric.bind(telemetry);
