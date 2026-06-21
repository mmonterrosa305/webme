type JsonRecord = Record<string, unknown>;

function formatUploadFailure(status: number, bodyPreview: string): string {
  if (status === 413) {
    return "Video file is too large. Maximum size is 50 MB.";
  }

  if (status === 404) {
    return "Upload API was not found. Refresh the page and try again.";
  }

  if (status === 502 || status === 503 || status === 504) {
    return `Upload timed out or the server gateway returned HTTP ${status}. Try again, or use a smaller video if the problem persists.`;
  }

  if (bodyPreview.startsWith("<!DOCTYPE") || bodyPreview.startsWith("<html")) {
    return `Upload failed (HTTP ${status}). The server returned an error page instead of JSON.`;
  }

  return bodyPreview
    ? `Upload failed (HTTP ${status}): ${bodyPreview}`
    : `Upload failed (HTTP ${status}).`;
}

export async function readJsonResponse<T extends JsonRecord>(
  response: Response,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = (await response.text()).replace(/\s+/g, " ").trim();
    const preview = text.slice(0, 160);
    throw new Error(formatUploadFailure(response.status, preview));
  }

  return (await response.json()) as T;
}
