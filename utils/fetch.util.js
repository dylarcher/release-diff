import { AUTH_TYPES, HTTP_HEADERS, CONSOLE_MESSAGES, ERROR_MESSAGES, DEFAULT_VALUES } from '../shared/constants.js';

class ApiRequestManager {
  static async makeAuthenticatedApiRequest(url, token, tokenType = AUTH_TYPES.BEARER) {
    const headers = { [HTTP_HEADERS.CONTENT_TYPE]: HTTP_HEADERS.APPLICATION_JSON };

    const authHeaders = {
      [AUTH_TYPES.BASIC]: () => {
        console.log(CONSOLE_MESSAGES.USING_BASIC_AUTH_FOR_JIRA);
        const encodedToken = token.includes(DEFAULT_VALUES.COLON_SEPARATOR)
          ? btoa(token)
          : btoa(`${token}${DEFAULT_VALUES.COLON_SEPARATOR}`);
        return `${AUTH_TYPES.BASIC} ${encodedToken}`;
      },
      [AUTH_TYPES.BEARER]: () => `${AUTH_TYPES.BEARER} ${token}`
    };

    headers[HTTP_HEADERS.AUTHORIZATION] = authHeaders[tokenType]();

    console.log(CONSOLE_MESSAGES.MAKING_API_REQUEST_TO, url);
    console.log(CONSOLE_MESSAGES.AUTH_TYPE, tokenType);

    try {
      const response = await fetch(url, { headers });
      console.log(CONSOLE_MESSAGES.API_RESPONSE_STATUS, response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(CONSOLE_MESSAGES.API_ERROR_RESPONSE, `${errorText.substring(0, DEFAULT_VALUES.ERROR_TEXT_SUBSTRING_LENGTH)}...`);
        throw new Error(`${ERROR_MESSAGES.API_CALL_FAILED} ${response.status} ${response.statusText} - ${errorText.substring(0, DEFAULT_VALUES.ERROR_MESSAGE_SUBSTRING_LENGTH)}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`${CONSOLE_MESSAGES.ERROR_FETCHING_FROM} ${url}:`, error);
      throw error;
    }
  }

  static buildCleanApiUrl(baseUrl, endpoint) {
    const cleanBase = baseUrl.endsWith(DEFAULT_VALUES.URL_PATH_SEPARATOR) ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith(DEFAULT_VALUES.URL_PATH_SEPARATOR) ? endpoint : `${DEFAULT_VALUES.URL_PATH_SEPARATOR}${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  }
}
export const makeAuthenticatedApiRequest = ApiRequestManager.makeAuthenticatedApiRequest;
export const buildCleanApiUrl = ApiRequestManager.buildCleanApiUrl;
export default ApiRequestManager;
