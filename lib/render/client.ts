const RENDER_API_BASE = "https://api.render.com/v1";

type RenderServiceListItem = {
  service?: {
    id?: string;
    slug?: string;
    name?: string;
  };
};

export type RenderClientOptions = {
  apiKey: string;
};

function resolveApiKey(apiKey?: string): string {
  const key = apiKey?.trim() || process.env.RENDER_API_KEY?.trim();

  if (!key) {
    throw new Error("Missing RENDER_API_KEY environment variable.");
  }

  return key;
}

async function renderRequest(
  path: string,
  init: RequestInit = {},
  apiKey?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${resolveApiKey(apiKey)}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${RENDER_API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Render API ${response.status} ${path}: ${body}`);
  }

  return response;
}

export async function resolveRenderServiceId(
  apiKey?: string,
): Promise<string> {
  const configured = process.env.RENDER_SERVICE_ID?.trim();

  if (configured) {
    return configured;
  }

  const slug = process.env.RENDER_SERVICE_SLUG?.trim() || "webme-x6ed";
  const response = await renderRequest("/services?limit=100", {}, apiKey);
  const services = (await response.json()) as RenderServiceListItem[];

  const match = services.find((entry) => entry.service?.slug === slug);

  if (!match?.service?.id) {
    throw new Error(
      `Could not find Render service with slug "${slug}". Set RENDER_SERVICE_ID on the server.`,
    );
  }

  return match.service.id;
}

export async function updateRenderServiceEnvVar(
  serviceId: string,
  envVarKey: string,
  value: string,
  apiKey?: string,
): Promise<void> {
  await renderRequest(
    `/services/${serviceId}/env-vars/${encodeURIComponent(envVarKey)}`,
    {
      method: "PUT",
      body: JSON.stringify({ value }),
    },
    apiKey,
  );
}

export async function triggerRenderDeploy(
  serviceId: string,
  apiKey?: string,
): Promise<string | null> {
  const response = await renderRequest(
    `/services/${serviceId}/deploys`,
    {
      method: "POST",
      body: JSON.stringify({ clearCache: "do_not_clear" }),
    },
    apiKey,
  );

  const payload = (await response.json()) as {
    id?: string;
    deploy?: { id?: string };
  };

  return payload.deploy?.id ?? payload.id ?? null;
}

/** Register a custom domain on the WebMe Render service. */
export async function addRenderCustomDomain(
  domain: string,
  apiKey?: string,
): Promise<void> {
  const name = domain.trim().toLowerCase();

  if (!name) {
    throw new Error("Domain name is required.");
  }

  const serviceId = await resolveRenderServiceId(apiKey);

  await renderRequest(
    `/services/${encodeURIComponent(serviceId)}/custom-domains`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    apiKey,
  );
}

export async function validateRenderApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${RENDER_API_BASE}/services?limit=1`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
