export async function makeAuthenticatedApiRequest(url, token, tokenType = 'Bearer') {
  const headers = { 'Content-Type': 'application/json' };

  if (tokenType === 'Basic') {
    console.log('Using Basic authentication for Jira');
    headers['Authorization'] = token.includes(':')
      ? `Basic ${btoa(token)}`
      : `Basic ${btoa(token + ':')}`;
  } else {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('Making API request to:', url);
  console.log('Auth type:', tokenType);

  try {
    const response = await fetch(url, { headers });
    console.log('API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText.substring(0, 500) + '...');
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
}

export function buildCleanApiUrl(baseUrl, endpoint) {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}
