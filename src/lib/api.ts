export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type GraphQLOptions = {
  variables?: Record<string, unknown>;
  adminToken?: string;
  init?: RequestInit;
};

export async function graphqlRequest<T = Record<string, unknown>>(
  query: string,
  { variables = {}, adminToken, init }: GraphQLOptions = {}
): Promise<T> {
  const res = await fetch(`${API_URL}/graphql`, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminToken && { "x-admin-token": adminToken }),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}
