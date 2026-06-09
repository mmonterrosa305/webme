export type ApolloEmailResult = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  confidence: number | null;
};

function getApolloApiKey(): string | null {
  const key = process.env.APOLLO_API_KEY?.trim();
  return key || null;
}

export async function findEmailApollo(input: {
  businessName: string;
  city: string;
  phone?: string | null;
}): Promise<ApolloEmailResult> {
  const apiKey = getApolloApiKey();
  if (!apiKey) {
    return { email: null, firstName: null, lastName: null, title: null, confidence: null };
  }

  try {
    // Step 1: Search for the organization
    const orgResponse = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_organization_name: input.businessName,
        q_organization_locations: [input.city],
        per_page: 1,
      }),
    });

    if (!orgResponse.ok) {
      return { email: null, firstName: null, lastName: null, title: null, confidence: null };
    }

    const orgData = await orgResponse.json() as {
      organizations?: Array<{ id?: string; name?: string }>;
    };

    const orgId = orgData.organizations?.[0]?.id;

    // Step 2: Search for people at that organization
    const peopleResponse = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_organization_name: input.businessName,
        person_locations: [input.city],
        titles: ["owner", "founder", "president", "ceo", "manager"],
        per_page: 1,
        ...(orgId ? { organization_ids: [orgId] } : {}),
      }),
    });

    if (!peopleResponse.ok) {
      return { email: null, firstName: null, lastName: null, title: null, confidence: null };
    }

    const peopleData = await peopleResponse.json() as {
      people?: Array<{
        email?: string;
        first_name?: string;
        last_name?: string;
        title?: string;
        email_status?: string;
      }>;
    };

    const person = peopleData.people?.[0];
    if (!person) {
      return { email: null, firstName: null, lastName: null, title: null, confidence: null };
    }

    return {
      email: person.email ?? null,
      firstName: person.first_name ?? null,
      lastName: person.last_name ?? null,
      title: person.title ?? null,
      confidence: person.email_status === "verified" ? 100 : 70,
    };
  } catch {
    return { email: null, firstName: null, lastName: null, title: null, confidence: null };
  }
}
