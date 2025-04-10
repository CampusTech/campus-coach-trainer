export async function fetchEphemeralKey(): Promise<string | null> {
  try {
    const response = await fetch('/api/session');
    if (!response.ok) {
      console.error('Failed to fetch ephemeral key:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data.client_secret?.value) {
      console.error('No ephemeral key provided by the server');
      return null;
    }

    return data.client_secret.value;
  } catch (error) {
    console.error('Error fetching ephemeral key:', error);
    return null;
  }
}