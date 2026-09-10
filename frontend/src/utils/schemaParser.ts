import { DocField, DocMetadata, DocResponseExample, HeaderParamItem, RequestItem } from '../types';

/**
 * Humanizes camelCase, PascalCase, or snake_case field names into readable descriptions
 */
export function humanizeKeyName(key: string): string {
  const lower = key.toLowerCase();
  if (lower === 'id') return 'Unique identifier';
  if (lower === 'email') return 'Valid user email address';
  if (lower === 'password') return 'Account password (recommended min 8 chars)';
  if (lower === 'name') return 'Full name / display name';
  if (lower === 'firstname' || lower === 'first_name') return 'First name of the user';
  if (lower === 'lastname' || lower === 'last_name') return 'Last name / surname';
  if (lower === 'username') return 'Unique username or handle';
  if (lower === 'role') return 'User authorization role (e.g. admin, developer, viewer)';
  if (lower === 'status') return 'Status state (e.g. active, pending, resolved)';
  if (lower === 'price' || lower === 'amount') return 'Numeric price / monetary amount';
  if (lower === 'currency') return 'ISO 4217 Currency code (e.g. USD, EUR, INR)';
  if (lower === 'instock' || lower === 'in_stock') return 'Inventory stock availability flag';
  if (lower === 'category') return 'Classification or catalog category';
  if (lower === 'token') return 'Authentication or verification token string';
  if (lower === 'createdat' || lower === 'created_at') return 'Creation ISO-8601 timestamp';
  if (lower === 'updatedat' || lower === 'updated_at') return 'Last updated ISO-8601 timestamp';
  if (lower === 'page') return 'Pagination page number (1-indexed)';
  if (lower === 'limit' || lower === 'pagesize') return 'Maximum items returned per page';
  if (lower === 'query' || lower === 'q' || lower === 'search') return 'Search keyword filter';

  // Fallback humanizer
  const formatted = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Parses a request payload string into a structured list of DocField items
 */
export function parsePayloadToDocFields(bodyContent: string, bodyType: string): DocField[] {
  const fields: DocField[] = [];
  if (!bodyContent || !bodyContent.trim()) return fields;

  const normalizedType = (bodyType || 'none').toLowerCase();

  if (normalizedType === 'json') {
    try {
      const parsed = JSON.parse(bodyContent);
      if (typeof parsed === 'object' && parsed !== null) {
        // If it's an array of objects, take the first item
        const sample = Array.isArray(parsed) ? parsed[0] : parsed;
        if (typeof sample === 'object' && sample !== null) {
          for (const [key, value] of Object.entries(sample)) {
            let fieldType: DocField['type'] = 'string';
            let exampleVal = '';
            let isReq = true;

            if (Array.isArray(value)) {
              fieldType = 'array';
              exampleVal = JSON.stringify(value).slice(0, 60);
              isReq = value.length > 0;
            } else if (value === null) {
              fieldType = 'string';
              exampleVal = 'null';
              isReq = false;
            } else if (typeof value === 'number') {
              fieldType = 'number';
              exampleVal = String(value);
              isReq = true;
            } else if (typeof value === 'boolean') {
              fieldType = 'boolean';
              exampleVal = String(value);
              isReq = true;
            } else if (typeof value === 'object') {
              fieldType = 'object';
              exampleVal = JSON.stringify(value).slice(0, 60);
              isReq = Object.keys(value).length > 0;
            } else {
              fieldType = 'string';
              exampleVal = String(value);
              // If empty string or key hints optional
              if (
                exampleVal === '' ||
                key.toLowerCase().includes('optional') ||
                key.toLowerCase().includes('notes')
              ) {
                isReq = false;
              }
            }

            fields.push({
              name: key,
              type: fieldType,
              required: isReq,
              description: humanizeKeyName(key),
              example: exampleVal,
            });
          }
        }
      }
    } catch {
      // Not valid JSON, return single raw body field
      fields.push({
        name: 'raw_payload',
        type: 'string',
        required: true,
        description: 'Raw request body payload',
        example: bodyContent.slice(0, 80),
      });
    }
  } else if (normalizedType === 'form-data' || normalizedType === 'x-www-form-urlencoded') {
    try {
      const items = JSON.parse(bodyContent);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.enabled && item.key) {
            fields.push({
              name: item.key,
              type: 'string',
              required: Boolean(item.value && item.value.trim() !== ''),
              description: humanizeKeyName(item.key),
              example: item.value || '',
            });
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  return fields;
}

/**
 * Extracts DocFields from query params or headers JSON strings
 */
export function parseHeaderParamToDocFields(jsonString: string): DocField[] {
  const fields: DocField[] = [];
  if (!jsonString) return fields;

  try {
    const items: HeaderParamItem[] = JSON.parse(jsonString);
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.enabled && item.key) {
          fields.push({
            name: item.key,
            type: 'string',
            required: Boolean(item.value && item.value.trim() !== ''),
            description: humanizeKeyName(item.key),
            example: item.value || '',
          });
        }
      }
    }
  } catch {
    // Ignored
  }

  return fields;
}

/**
 * Generates default realistic error response template
 */
export function generateDefaultErrorResponse(
  statusCode: number = 400,
  fieldName: string = 'payload'
): DocResponseExample {
  let errorMsg = 'Bad Request';
  let detail = `Invalid or missing required field: '${fieldName}'`;

  if (statusCode === 401) {
    errorMsg = 'Unauthorized';
    detail = 'Missing or invalid Bearer authentication token in Authorization header.';
  } else if (statusCode === 403) {
    errorMsg = 'Forbidden';
    detail = 'You do not have sufficient permissions to access this endpoint.';
  } else if (statusCode === 404) {
    errorMsg = 'Not Found';
    detail = 'The requested resource was not found on this server.';
  } else if (statusCode === 500) {
    errorMsg = 'Internal Server Error';
    detail = 'An unexpected server error occurred. Please try again later.';
  }

  return {
    statusCode,
    statusText: errorMsg,
    description: `Typical ${statusCode} response when validation fails or request is malformed.`,
    body: JSON.stringify(
      {
        success: false,
        error: errorMsg,
        message: detail,
        statusCode,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    ),
  };
}

/**
 * Generates a clean, comprehensive Markdown document ready to share with frontend devs
 */
export function generateMarkdownDoc(request: RequestItem, doc: DocMetadata): string {
  const method = (request.method || 'GET').toUpperCase();
  const title = request.name || 'API Endpoint Documentation';
  const url = request.url || '';
  const summary = doc.summary || request.description || 'API endpoint specification.';

  let md = `# ${method} ${title}\n\n`;
  md += `> **Endpoint:** \`${url}\`  \n`;
  md += `> **Method:** \`${method}\`  \n`;
  md += `> **Description:** ${summary}\n\n`;

  // Headers section
  const headers = doc.headerFields || parseHeaderParamToDocFields(request.headers);
  if (headers.length > 0) {
    md += `## 📋 Required Request Headers\n\n`;
    md += `| Header | Mandatory | Description | Example |\n`;
    md += `| :--- | :---: | :--- | :--- |\n`;
    for (const h of headers) {
      const reqBadge = h.required ? '**Yes (Required)**' : '*Optional*';
      md += `| \`${h.name}\` | ${reqBadge} | ${h.description} | \`${h.example || ''}\` |\n`;
    }
    md += `\n`;
  }

  // Query Params section
  const params = doc.queryFields || parseHeaderParamToDocFields(request.params);
  if (params.length > 0) {
    md += `## 🔍 Query Parameters\n\n`;
    md += `| Parameter | Type | Mandatory | Description | Example |\n`;
    md += `| :--- | :---: | :---: | :--- | :--- |\n`;
    for (const p of params) {
      const reqBadge = p.required ? '**Yes (Required)**' : '*Optional*';
      md += `| \`${p.name}\` | \`${p.type}\` | ${reqBadge} | ${p.description} | \`${p.example || ''}\` |\n`;
    }
    md += `\n`;
  }

  // Request Body Payload
  const fields = doc.fields && doc.fields.length > 0
    ? doc.fields
    : parsePayloadToDocFields(request.bodyContent, request.bodyType);

  if (fields.length > 0) {
    md += `## 📦 Request Payload (${request.bodyType || 'json'})\n\n`;
    md += `| Field Name | Type | Mandatory | Description | Example Value |\n`;
    md += `| :--- | :---: | :---: | :--- | :--- |\n`;
    for (const f of fields) {
      const reqBadge = f.required ? '🔴 **Yes (Required)**' : '⚪ *Optional*';
      md += `| \`${f.name}\` | \`${f.type}\` | ${reqBadge} | ${f.description} | \`${f.example || ''}\` |\n`;
    }
    md += `\n`;

    if (request.bodyContent && request.bodyType === 'json') {
      md += `### Payload Example (JSON)\n\`\`\`json\n${request.bodyContent}\n\`\`\`\n\n`;
    }
  }

  // Success Response
  if (doc.successResponse) {
    md += `## ✅ Success Response (${doc.successResponse.statusCode} ${doc.successResponse.statusText})\n`;
    if (doc.successResponse.description) {
      md += `${doc.successResponse.description}\n\n`;
    }
    md += `\`\`\`json\n${doc.successResponse.body}\n\`\`\`\n\n`;
  }

  // Error Responses
  if (doc.errorResponses && doc.errorResponses.length > 0) {
    md += `## ❌ Error Responses\n\n`;
    for (const err of doc.errorResponses) {
      md += `### ${err.statusCode} ${err.statusText}\n`;
      if (err.description) md += `${err.description}\n\n`;
      md += `\`\`\`json\n${err.body}\n\`\`\`\n\n`;
    }
  }

  // Frontend Integration Code Snippet
  md += `## 💻 Frontend Integration (JavaScript / TypeScript)\n\n`;
  md += `\`\`\`typescript\n`;
  md += `// Using standard fetch:\n`;
  md += `async function call${title.replace(/[^a-zA-Z0-9]/g, '')}() {\n`;
  md += `  try {\n`;
  md += `    const response = await fetch('${url}', {\n`;
  md += `      method: '${method}',\n`;
  md += `      headers: {\n`;
  md += `        'Content-Type': 'application/json',\n`;
  if (request.authType === 'bearer') {
    md += `        'Authorization': 'Bearer <YOUR_TOKEN>',\n`;
  }
  md += `      },\n`;
  if (method !== 'GET' && method !== 'HEAD' && request.bodyContent) {
    md += `      body: JSON.stringify(${request.bodyContent.trim()}),\n`;
  }
  md += `    });\n\n`;
  md += `    const data = await response.json();\n`;
  md += `    if (!response.ok) {\n`;
  md += `      throw new Error(data.message || 'API request failed');\n`;
  md += `    }\n`;
  md += `    console.log('Success:', data);\n`;
  md += `    return data;\n`;
  md += `  } catch (error) {\n`;
  md += `    console.error('Error hitting ${title}:', error);\n`;
  md += `  }\n`;
  md += `}\n`;
  md += `\`\`\`\n\n`;

  md += `---\n*Generated instantly with ⚡ Synqo API Hub*\n`;
  return md;
}

/**
 * Generates full collection documentation markdown
 */
export function generateCollectionMarkdownDoc(
  collectionName: string,
  description: string,
  requests: RequestItem[]
): string {
  let md = `# 📖 ${collectionName} - API Documentation\n\n`;
  md += `> ${description || 'Complete API collection specification for frontend & client integration.'}\n\n`;
  md += `**Total Endpoints:** ${requests.length}  \n`;
  md += `**Generated on:** ${new Date().toLocaleDateString()}  \n\n`;
  md += `---\n\n`;

  // Table of Contents
  md += `## Table of Contents\n\n`;
  for (let i = 0; i < requests.length; i++) {
    const r = requests[i];
    const anchor = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    md += `${i + 1}. [${r.method} ${r.name}](#${anchor}) - \`${r.url}\`\n`;
  }
  md += `\n---\n\n`;

  // Each request doc
  for (const req of requests) {
    let doc: DocMetadata = {};
    if (req.docsMetadata) {
      try {
        doc = JSON.parse(req.docsMetadata);
      } catch {
        doc = {};
      }
    }
    md += generateMarkdownDoc(req, doc);
    md += `\n\n---\n\n`;
  }

  return md;
}
