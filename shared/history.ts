export function budgetHistory<T extends { role: string; content: string }>(
  messages: T[],
  maxChars = 48_000,
): T[] {
  const result: T[] = [];
  let used = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (used + message.content.length > maxChars) break;
    result.unshift(message);
    used += message.content.length;
  }
  // Start at a complete user turn after trimming old context.
  while (result[0]?.role !== "user" && result.length) result.shift();
  return result;
}

/** Conservative UTF-8 budget: even one token per byte leaves headroom below
 * Luna's 922k input and 1.05M context limits, including the 32k output cap. */
export function assertContextBudget(...parts: unknown[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts)).byteLength;
  if (bytes > 800_000)
    throw new Error(
      "The combined documentation and conversation are too large. Reduce the source material or start a new conversation.",
    );
}
