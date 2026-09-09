import {
  AssertionRule,
  AssertionResult,
  ExecuteResponsePayload,
  VariableItem,
} from '../types';
import { api } from './api';

/**
 * Checks if a target URL points to a local/device service
 */
export function isLocalUrl(url: string): boolean {
  if (!url) return false;
  try {
    const cleanUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    );
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
}

/**
 * Resolves dynamic {{variable}} tokens using active environment variables
 */
export function resolveVariables(text: string, variables: VariableItem[]): string {
  if (!text || !variables || variables.length === 0) return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim().toLowerCase();
    const found = variables.find(
      (v) => v.enabled && v.key.trim().toLowerCase() === trimmed
    );
    return found ? found.value : match;
  });
}

/**
 * Evaluates test assertion rules against browser response
 */
export function evaluateBrowserAssertions(
  rules: AssertionRule[] = [],
  statusCode: number,
  latencyMs: number,
  headers: Record<string, string>,
  body: string
): AssertionResult[] {
  return rules.map((rule) => {
    const res: AssertionResult = {
      rule,
      passed: false,
      actual: '',
      expected: rule.value,
      message: '',
    };

    switch (rule.type) {
      case 'status_code': {
        const expectedInt = parseInt(rule.value, 10);
        res.actual = String(statusCode);
        if (rule.operator === 'equals') {
          res.passed = statusCode === expectedInt;
          res.message = res.passed
            ? `Status code is ${statusCode}`
            : `Expected status ${expectedInt} but got ${statusCode}`;
        } else if (rule.operator === 'not_equals') {
          res.passed = statusCode !== expectedInt;
          res.message = `Status code is not ${expectedInt}`;
        } else if (rule.operator === 'is_2xx') {
          res.passed = statusCode >= 200 && statusCode < 300;
          res.message = res.passed
            ? `Status code ${statusCode} is 2xx success`
            : `Expected 2xx status code but got ${statusCode}`;
        } else {
          res.passed = statusCode === expectedInt;
          res.message = `Status is ${statusCode}`;
        }
        break;
      }

      case 'response_time': {
        const maxMs = parseInt(rule.value, 10);
        res.actual = `${latencyMs}ms`;
        if (rule.operator === 'less_than') {
          res.passed = latencyMs < maxMs;
          res.message = res.passed
            ? `Response time ${latencyMs}ms is under ${maxMs}ms`
            : `Response time ${latencyMs}ms exceeded ${maxMs}ms`;
        } else if (rule.operator === 'greater_than') {
          res.passed = latencyMs > maxMs;
          res.message = `Response time is ${latencyMs}ms`;
        } else {
          res.passed = latencyMs < maxMs;
        }
        break;
      }

      case 'body_contains': {
        res.passed = body.includes(rule.value);
        res.actual = `Body length: ${body.length} chars`;
        res.message = res.passed
          ? `Body contains '${rule.value}'`
          : `Body does not contain '${rule.value}'`;
        break;
      }

      case 'header_exists': {
        const targetHeader = rule.value.toLowerCase();
        const found = Object.keys(headers).some(
          (k) => k.toLowerCase() === targetHeader
        );
        res.passed = found;
        res.actual = `Header present: ${found}`;
        res.message = res.passed
          ? `Header '${rule.value}' exists in response`
          : `Header '${rule.value}' was not found`;
        break;
      }

      default:
        res.passed = true;
        res.message = 'Assertion passed';
    }

    return res;
  });
}

/**
 * Executes an HTTP request directly from the user's browser.
 * This allows testing localhost APIs running on the user's local machine even when Synqo is deployed!
 */
export async function executeBrowserDirect(
  payload: any,
  variables: VariableItem[] = []
): Promise<ExecuteResponsePayload> {
  // 1. Resolve variables in URL, headers, and body
  let targetUrl = resolveVariables(payload.url || '', variables);
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `http://${targetUrl}`;
  }

  // 2. Append query parameters
  const parsedUrl = new URL(targetUrl);
  if (Array.isArray(payload.params)) {
    for (const p of payload.params) {
      if (p.enabled && p.key) {
        const val = resolveVariables(p.value || '', variables);
        parsedUrl.searchParams.append(p.key, val);
      }
    }
  }
  const finalUrl = parsedUrl.toString();

  // 3. Prepare headers
  const outgoingHeaders: Record<string, string> = {};
  if (Array.isArray(payload.headers)) {
    for (const h of payload.headers) {
      if (h.enabled && h.key) {
        outgoingHeaders[h.key] = resolveVariables(h.value || '', variables);
      }
    }
  }

  // 4. Handle Auth
  if (payload.authType === 'bearer' && payload.authConfig?.token) {
    const token = resolveVariables(payload.authConfig.token, variables);
    outgoingHeaders['Authorization'] = `Bearer ${token}`;
  } else if (payload.authType === 'basic' && payload.authConfig) {
    const user = resolveVariables(payload.authConfig.username || '', variables);
    const pass = resolveVariables(payload.authConfig.password || '', variables);
    outgoingHeaders['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
  } else if (payload.authType === 'apikey' && payload.authConfig) {
    const key = resolveVariables(payload.authConfig.key || '', variables);
    const val = resolveVariables(payload.authConfig.value || '', variables);
    if (payload.authConfig.addTo === 'query') {
      parsedUrl.searchParams.append(key, val);
    } else {
      outgoingHeaders[key] = val;
    }
  }

  // 5. Prepare Body
  let bodyContent: BodyInit | undefined = undefined;
  const bodyType = (payload.bodyType || 'none').toLowerCase();
  let resolvedRawBody = resolveVariables(payload.bodyContent || '', variables);

  if (bodyType === 'json') {
    if (!outgoingHeaders['Content-Type'] && !outgoingHeaders['content-type']) {
      outgoingHeaders['Content-Type'] = 'application/json';
    }
    bodyContent = resolvedRawBody || undefined;
  } else if (bodyType === 'raw') {
    if (!outgoingHeaders['Content-Type'] && !outgoingHeaders['content-type']) {
      outgoingHeaders['Content-Type'] = 'text/plain';
    }
    bodyContent = resolvedRawBody || undefined;
  } else if (bodyType === 'x-www-form-urlencoded') {
    if (!outgoingHeaders['Content-Type'] && !outgoingHeaders['content-type']) {
      outgoingHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    try {
      const items = JSON.parse(resolvedRawBody);
      if (Array.isArray(items)) {
        const formParams = new URLSearchParams();
        items.forEach((item: any) => {
          if (item.enabled && item.key) {
            formParams.append(
              item.key,
              resolveVariables(item.value || '', variables)
            );
          }
        });
        bodyContent = formParams.toString();
      } else {
        bodyContent = resolvedRawBody;
      }
    } catch {
      bodyContent = resolvedRawBody;
    }
  } else if (bodyType === 'form-data' || bodyType === 'formdata') {
    // For FormData, let the browser set boundary automatically
    try {
      const items = JSON.parse(resolvedRawBody);
      if (Array.isArray(items)) {
        const fd = new FormData();
        items.forEach((item: any) => {
          if (item.enabled && item.key) {
            fd.append(item.key, resolveVariables(item.value || '', variables));
          }
        });
        bodyContent = fd;
        delete outgoingHeaders['Content-Type'];
        delete outgoingHeaders['content-type'];
      }
    } catch {
      bodyContent = resolvedRawBody;
    }
  }

  // Don't attach body to GET or HEAD requests
  const method = (payload.method || 'GET').toUpperCase();
  const requestBody = method === 'GET' || method === 'HEAD' ? undefined : bodyContent;

  const startTime = performance.now();

  try {
    const res = await fetch(finalUrl, {
      method,
      headers: outgoingHeaders,
      body: requestBody,
      mode: 'cors',
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const responseText = await res.text();
    const responseSize = new Blob([responseText]).size;

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    // Evaluate assertions
    const assertionResults = evaluateBrowserAssertions(
      payload.tests || [],
      res.status,
      latencyMs,
      responseHeaders,
      responseText
    );
    const assertionsPassed = assertionResults.filter((r) => r.passed).length;

    const result: ExecuteResponsePayload = {
      statusCode: res.status,
      statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
      latencyMs,
      responseSize,
      headers: responseHeaders,
      body: responseText,
      assertionsPassed,
      assertionsTotal: assertionResults.length,
      assertionDetails: assertionResults,
      historyId: '',
    };

    // Background asynchronous sync to workspace history and telemetry
    if (payload.workspaceId) {
      api.recordExecution({
        workspaceId: payload.workspaceId,
        requestItemId: payload.requestItemId || '',
        requestName: payload.requestName || 'Direct Local Request',
        method,
        url: finalUrl,
        statusCode: res.status,
        statusText: result.statusText,
        latencyMs,
        responseSize,
        responseHeaders: JSON.stringify(responseHeaders),
        responseBody: responseText,
        assertionsPassed,
        assertionsTotal: assertionResults.length,
        assertionDetails: JSON.stringify(assertionResults),
      }).then((rec) => {
        if (rec?.historyId) {
          result.historyId = rec.historyId;
        }
      }).catch(() => {
        // Silently ignore background record sync errors so local runner never fails
      });
    }

    return result;
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);

    // Provide friendly, actionable error information for local API developers
    const isLocal = isLocalUrl(finalUrl);
    const friendlyHelp = isLocal
      ? `\n\n💡 Tip for testing Local APIs:\n1. Ensure your local server is running on: ${finalUrl}\n2. Ensure your local API has CORS enabled:\n   • Express: app.use(require('cors')())\n   • FastAPI: app.add_middleware(CORSMiddleware, allow_origins=["*"])\n   • Django: Add 'corsheaders' to INSTALLED_APPS\n   • Spring Boot: @CrossOrigin(origins = "*")`
      : `\n\n💡 If this public API does not support browser CORS, switch runner mode to "Cloud Proxy".`;

    return {
      statusCode: 0,
      statusText: 'CORS / Connection Error',
      latencyMs,
      responseSize: 0,
      headers: {},
      body: `Connection failed: ${err.message || 'Unable to connect to server.'}${friendlyHelp}`,
      assertionsPassed: 0,
      assertionsTotal: 0,
      assertionDetails: [],
      historyId: '',
    };
  }
}
