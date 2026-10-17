const technicalErrorPatterns = [
  /\[CONVEX\b/i,
  /\[Request ID:/i,
  /\bServer Error\b/i,
  /\bUncaught Error:/i,
  /\bArgumentValidationError\b/i,
  /\bValidator:\s*v\./i,
  /\bCalled by client\b/i,
  /^(?:Type|Reference|Syntax|Range|Convex|InternalServer)Error\b/i,
  /Cannot read (?:properties|property) of (?:undefined|null)/i,
  /\bis not a function\b/i,
  /\bat\s+\S+\s+\(/,
  /\.(?:ts|tsx|js):\d+:\d+/i,
];

function readMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const candidate = error as { message?: unknown; data?: unknown };
  if (typeof candidate.message === "string") return candidate.message;
  if (typeof candidate.data === "string") return candidate.data;
  if (candidate.data && typeof candidate.data === "object" && "message" in candidate.data) {
    const { message } = candidate.data as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return "";
}

function removeConvexEnvelope(message: string): string {
  const uncaught = message.match(/Uncaught Error:\s*([\s\S]*?)(?=\s+at\s+handler\b|\s+Called by client\b|$)/i);
  if (uncaught?.[1]) return uncaught[1].trim();
  return message.trim();
}

function translateExpectedMessage(message: string): string | undefined {
  const normalized = message.toLowerCase().replace(/[.!]+$/, "");
  if (normalized.includes("save your internship placement details first")) {
    return "Save your placement details before adding an agency contact or log book entry.";
  }
  if (normalized.includes("authentication required") || normalized.includes("unauthenticated")) {
    return "Your session may have expired. Sign in again to continue.";
  }
  if (normalized.startsWith("permission denied") || normalized.includes("not authorized")) {
    return "You do not have permission to do that. Contact your administrator if you need access.";
  }
  if (normalized.includes("student profile not found")) {
    return "We could not find your student profile. Contact the Registrar for help.";
  }
  if (normalized.includes("already submitted") || normalized.includes("already registered")) {
    return "This has already been submitted.";
  }
  return undefined;
}

/** Return a safe, actionable message without exposing Convex request IDs or stack traces. */
export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  const message = removeConvexEnvelope(readMessage(error));
  if (!message || technicalErrorPatterns.some((pattern) => pattern.test(message))) return fallback;

  const translated = translateExpectedMessage(message);
  if (translated) return translated;

  if (message.length <= 180 && !/\bat\s+\w+\s*\(/.test(message) && !/\n\s*at\s/.test(message)) {
    return message;
  }
  return fallback;
}
