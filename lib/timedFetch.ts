// Abort stalled network requests instead of leaving authentication pending forever.
export async function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const sourceSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const abort = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) abort();
  else sourceSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("Network request timed out. Please try again.")), 30000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    // Supabase normally converts non-2xx responses into result.error. A rejected
    // fetch can escape background effects and trigger Next.js' development error
    // overlay, so convert network/timeout failures into a normal 503 response.
    const message = error instanceof Error && error.message ? error.message : "Network request failed";
    return new Response(JSON.stringify({ message, error: message }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", abort);
  }
}
