import { HeaderParamItem, FormDataItem } from '../types';

export interface ParsedCurl {
  method: string;
  url: string;
  headers: HeaderParamItem[];
  params: HeaderParamItem[];
  bodyType: 'none' | 'json' | 'raw' | 'form-data' | 'x-www-form-urlencoded';
  bodyContent: string;
  formDataList: FormDataItem[];
  urlEncodedList: FormDataItem[];
  authType: 'none' | 'bearer' | 'basic' | 'apikey';
  authToken: string;
  basicUser: string;
  basicPass: string;
}

/**
 * Tokenize a cURL command string respecting single and double quotes, and line continuations
 */
function tokenizeCurl(input: string): string[] {
  // Normalize line continuations like `\` at the end of lines
  const normalized = input.replace(/\\\r?\n/g, ' ').trim();
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses raw cURL command into a structured API Request object
 */
export function parseCurl(curlCommand: string): ParsedCurl {
  const result: ParsedCurl = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    bodyType: 'none',
    bodyContent: '',
    formDataList: [],
    urlEncodedList: [],
    authType: 'none',
    authToken: '',
    basicUser: '',
    basicPass: '',
  };

  const trimmed = curlCommand.trim();
  if (!trimmed) return result;

  const tokens = tokenizeCurl(trimmed);
  if (tokens.length === 0) return result;

  // Filter out leading 'curl' if present
  let startIndex = 0;
  if (tokens[0].toLowerCase() === 'curl') {
    startIndex = 1;
  }

  let explicitMethod: string | null = null;
  const rawDataTokens: string[] = [];
  const formTokens: string[] = [];
  let isUrlEncodedFlag = false;

  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1] || '';

    // Method flags: -X POST, --request POST
    if (token === '-X' || token === '--request') {
      if (nextToken) {
        explicitMethod = nextToken.toUpperCase();
        i++;
      }
      continue;
    }

    // Headers flags: -H "Header: value", --header "..."
    if (token === '-H' || token === '--header') {
      if (nextToken) {
        const colonIdx = nextToken.indexOf(':');
        if (colonIdx > 0) {
          const key = nextToken.substring(0, colonIdx).trim();
          const value = nextToken.substring(colonIdx + 1).trim();
          result.headers.push({ key, value, enabled: true });
        }
        i++;
      }
      continue;
    }

    // Basic Auth flags: -u user:password, --user user:password
    if (token === '-u' || token === '--user') {
      if (nextToken) {
        const colonIdx = nextToken.indexOf(':');
        if (colonIdx > -1) {
          result.authType = 'basic';
          result.basicUser = nextToken.substring(0, colonIdx);
          result.basicPass = nextToken.substring(colonIdx + 1);
        } else {
          result.authType = 'basic';
          result.basicUser = nextToken;
        }
        i++;
      }
      continue;
    }

    // Body data flags: -d, --data, --data-raw, --data-binary, --data-urlencode
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary'
    ) {
      if (nextToken) {
        rawDataTokens.push(nextToken);
        i++;
      }
      continue;
    }

    if (token === '--data-urlencode') {
      if (nextToken) {
        rawDataTokens.push(nextToken);
        isUrlEncodedFlag = true;
        i++;
      }
      continue;
    }

    // Form data flags: -F "key=val", --form "..."
    if (token === '-F' || token === '--form') {
      if (nextToken) {
        formTokens.push(nextToken);
        i++;
      }
      continue;
    }

    // Target URL (any token not starting with '-' that hasn't been set yet)
    if (!token.startsWith('-') && !result.url) {
      result.url = token;
      continue;
    }
  }

  // Determine HTTP Method:
  if (explicitMethod) {
    result.method = explicitMethod;
  } else if (rawDataTokens.length > 0 || formTokens.length > 0) {
    result.method = 'POST';
  } else {
    result.method = 'GET';
  }

  // Parse Query Parameters from URL:
  if (result.url) {
    try {
      const testUrl = result.url.startsWith('http://') || result.url.startsWith('https://')
        ? result.url
        : `http://dummy.com/${result.url.replace(/^\/+/, '')}`;
      const parsedUrl = new URL(testUrl);

      if (parsedUrl.search) {
        const searchParams = new URLSearchParams(parsedUrl.search);
        searchParams.forEach((value, key) => {
          result.params.push({ key, value, enabled: true });
        });
      }
    } catch {
      const qIndex = result.url.indexOf('?');
      if (qIndex !== -1) {
        const queryPart = result.url.substring(qIndex + 1);
        const pairs = queryPart.split('&');
        pairs.forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k) {
            result.params.push({
              key: decodeURIComponent(k),
              value: decodeURIComponent(v || ''),
              enabled: true,
            });
          }
        });
      }
    }
  }

  // Check Headers for Content-Type and Authorization
  let detectedContentType = '';
  result.headers.forEach((h) => {
    if (h.key.toLowerCase() === 'content-type') {
      detectedContentType = h.value.toLowerCase();
    }
    if (h.key.toLowerCase() === 'authorization') {
      if (h.value.toLowerCase().startsWith('bearer ')) {
        result.authType = 'bearer';
        result.authToken = h.value.substring(7).trim();
      } else if (h.value.toLowerCase().startsWith('basic ')) {
        result.authType = 'basic';
        try {
          const decoded = atob(h.value.substring(6).trim());
          const colon = decoded.indexOf(':');
          if (colon !== -1) {
            result.basicUser = decoded.substring(0, colon);
            result.basicPass = decoded.substring(colon + 1);
          }
        } catch {
          // ignore base64 error
        }
      }
    }
  });

  // Process Body Data:
  if (formTokens.length > 0) {
    result.bodyType = 'form-data';
    formTokens.forEach((item) => {
      const eqIdx = item.indexOf('=');
      if (eqIdx !== -1) {
        const k = item.substring(0, eqIdx).trim();
        const v = item.substring(eqIdx + 1).trim();
        const isFile = v.startsWith('@');
        result.formDataList.push({
          key: k,
          value: isFile ? v.substring(1) : v,
          type: isFile ? 'file' : 'text',
          enabled: true,
        });
      } else {
        result.formDataList.push({ key: item.trim(), value: '', type: 'text', enabled: true });
      }
    });
  } else if (rawDataTokens.length > 0) {
    const rawJoined = rawDataTokens.join('&');

    let isJson = false;
    try {
      const parsed = JSON.parse(rawJoined);
      if (typeof parsed === 'object' && parsed !== null) {
        isJson = true;
        result.bodyType = 'json';
        result.bodyContent = JSON.stringify(parsed, null, 2);
      }
    } catch {
      isJson = false;
    }

    if (!isJson) {
      if (isUrlEncodedFlag || detectedContentType.includes('x-www-form-urlencoded') || rawJoined.includes('=')) {
        result.bodyType = 'x-www-form-urlencoded';
        result.bodyContent = rawJoined;
        const pairs = rawJoined.split('&');
        pairs.forEach((p) => {
          const eqIdx = p.indexOf('=');
          if (eqIdx !== -1) {
            try {
              result.urlEncodedList.push({
                key: decodeURIComponent(p.substring(0, eqIdx).replace(/\+/g, ' ')),
                value: decodeURIComponent(p.substring(eqIdx + 1).replace(/\+/g, ' ')),
                enabled: true,
              });
            } catch {
              result.urlEncodedList.push({
                key: p.substring(0, eqIdx),
                value: p.substring(eqIdx + 1),
                enabled: true,
              });
            }
          } else if (p.trim()) {
            result.urlEncodedList.push({ key: p.trim(), value: '', enabled: true });
          }
        });
      } else {
        result.bodyType = 'raw';
        result.bodyContent = rawJoined;
      }
    }
  }

  return result;
}
