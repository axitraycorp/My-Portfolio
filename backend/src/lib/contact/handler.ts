export async function handleContactSubmission(data: {
  name: string;
  email: string;
  message: string;
}) {
  console.log('📨 Sending contact submission to NestJS backend:', data);

  const response = await fetch('http://localhost:5000/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Contact submission failed: ${error.message || response.statusText}`,
    );
  }

  return await response.json();
}
