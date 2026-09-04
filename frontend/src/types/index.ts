export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
}

export interface HeaderParamItem {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AssertionRule {
  type: 'status_code' | 'response_time' | 'body_contains' | 'header_exists';
  operator: 'equals' | 'not_equals' | 'less_than' | 'greater_than' | 'contains' | 'is_2xx';
  value: string;
}

export interface AssertionResult {
  rule: AssertionRule;
  passed: boolean;
  actual: string;
  expected: string;
  message: string;
}

export interface RequestItem {
  id: string;
  workspaceId: string;
  collectionId: string;
  folderId?: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: string; // JSON
  params: string;  // JSON
  bodyType: string;
  bodyContent: string;
  authType: string;
  authConfig: string; // JSON
  tests: string;      // JSON
  orderIndex: number;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentId?: string;
  name: string;
  orderIndex: number;
}

export interface CollectionWithTree {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  orderIndex: number;
  folders: Folder[];
  requests: RequestItem[];
}

export interface VariableItem {
  key: string;
  value: string;
  isSecret: boolean;
  enabled: boolean;
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  variables: string; // JSON array of VariableItem
}

export interface MockEndpoint {
  id: string;
  workspaceId: string;
  name: string;
  method: string;
  path: string;
  statusCode: number;
  responseHeaders: string;
  responseBody: string;
  delayMs: number;
  isActive: boolean;
  hitCount: number;
  createdAt: string;
}

export interface MockRequestLog {
  id: string;
  mockEndpointId: string;
  workspaceId: string;
  method: string;
  path: string;
  clientIp: string;
  headers: string;
  queryParams: string;
  body: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

export interface TestHistory {
  id: string;
  workspaceId: string;
  requestItemId: string;
  requestName: string;
  method: string;
  url: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  responseSize: number;
  responseHeaders: string;
  responseBody: string;
  assertionsPassed: number;
  assertionsTotal: number;
  assertionDetails: string;
  executedAt: string;
}

export interface ExecuteResponsePayload {
  statusCode: number;
  statusText: string;
  latencyMs: number;
  responseSize: number;
  headers: Record<string, string>;
  body: string;
  assertionsPassed: number;
  assertionsTotal: number;
  assertionDetails: AssertionResult[];
  historyId: string;
}

export interface MetricsSummary {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  status2xxCount: number;
  status4xxCount: number;
  status5xxCount: number;
  topEndpoints: { endpoint: string; method: string; hits: number; avgMs: number }[];
  recentTimeline: { timeLabel: string; requests: number; avgMs: number; errors: number }[];
}

export interface DocParameter {
  name: string;
  in: string;
  required: boolean;
  description: string;
  schemaType: string;
  example: string;
}

export interface DocEndpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: DocParameter[];
  requestBody: string;
  responses: Record<string, any>;
  snippets: Record<string, string>;
}

export interface ParsedOpenAPISpec {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: DocEndpoint[];
}
