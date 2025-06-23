export async function graphqlRequest(query: string, variables = {}) {
    const res = await fetch('http://localhost:5000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  
    const json = await res.json();
    if (json.errors) {
      console.error(json.errors);
      throw new Error(json.errors[0].message);
    }
    return json.data;
  }
  