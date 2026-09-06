import {
  Workspace,
  CollectionWithTree,
  RequestItem,
  Environment,
  MockEndpoint,
  MockRequestLog,
  TestHistory,
  ExecuteResponsePayload,
  MetricsSummary,
  ParsedOpenAPISpec,
  User,
  WorkspaceMember,
  RequestComment,
} from '../types';

const envApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const envBasePath = import.meta.env.VITE_API_BASE_PATH || '/api/v1';
export const API_BASE = envApiUrl ? `${envApiUrl}${envBasePath}` : envBasePath;

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorMsg = `Error ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    fetchJSON<{ token: string; user: User }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { name: string; email: string; password: string }) =>
    fetchJSON<{ token: string; user: User }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => fetchJSON<User>(`${API_BASE}/auth/me`),

  // Workspaces
  getWorkspaces: () => fetchJSON<Workspace[]>(`${API_BASE}/workspaces`),
  createWorkspace: (data: { name: string; description: string }) =>
    fetchJSON<Workspace>(`${API_BASE}/workspaces`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMembers: (workspaceId: string) =>
    fetchJSON<WorkspaceMember[]>(`${API_BASE}/workspaces/${workspaceId}/members`),
  addMember: (workspaceId: string, data: { email: string; name?: string; role?: string }) =>
    fetchJSON<WorkspaceMember>(`${API_BASE}/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeMember: (workspaceId: string, memberId: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    }),
  updateMemberRole: (workspaceId: string, memberId: string, role: string) =>
    fetchJSON<WorkspaceMember>(`${API_BASE}/workspaces/${workspaceId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  // Collections & Requests
  getCollections: (workspaceId: string) =>
    fetchJSON<CollectionWithTree[]>(`${API_BASE}/workspaces/${workspaceId}/collections`),
  createCollection: (workspaceId: string, data: { name: string; description: string }) =>
    fetchJSON<any>(`${API_BASE}/workspaces/${workspaceId}/collections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCollection: (id: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/collections/${id}`, {
      method: 'DELETE',
    }),
  createRequest: (data: Partial<RequestItem>) =>
    fetchJSON<RequestItem>(`${API_BASE}/requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRequest: (id: string, data: Partial<RequestItem>) =>
    fetchJSON<RequestItem>(`${API_BASE}/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRequest: (id: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/requests/${id}`, { method: 'DELETE' }),

  // Environments
  getEnvironments: (workspaceId: string) =>
    fetchJSON<Environment[]>(`${API_BASE}/workspaces/${workspaceId}/environments`),
  createEnvironment: (workspaceId: string, data: Partial<Environment>) =>
    fetchJSON<Environment>(`${API_BASE}/workspaces/${workspaceId}/environments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEnvironment: (id: string, data: Partial<Environment>) =>
    fetchJSON<Environment>(`${API_BASE}/environments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Mock Engine
  getMocks: (workspaceId: string) =>
    fetchJSON<MockEndpoint[]>(`${API_BASE}/workspaces/${workspaceId}/mocks`),
  createMock: (workspaceId: string, data: Partial<MockEndpoint>) =>
    fetchJSON<MockEndpoint>(`${API_BASE}/workspaces/${workspaceId}/mocks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMock: (id: string, data: Partial<MockEndpoint>) =>
    fetchJSON<MockEndpoint>(`${API_BASE}/mocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMock: (id: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/mocks/${id}`, { method: 'DELETE' }),
  getMockLogs: (workspaceId: string, mockId?: string) => {
    const q = mockId ? `?mockId=${mockId}` : '';
    return fetchJSON<MockRequestLog[]>(`${API_BASE}/workspaces/${workspaceId}/mock-logs${q}`);
  },
  clearMockLogs: (workspaceId: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/workspaces/${workspaceId}/mock-logs`, {
      method: 'DELETE',
    }),

  // Test Runner
  executeRequest: (payload: any) =>
    fetchJSON<ExecuteResponsePayload>(`${API_BASE}/runner/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHistory: (workspaceId: string) =>
    fetchJSON<TestHistory[]>(`${API_BASE}/workspaces/${workspaceId}/history`),
  clearHistory: (workspaceId: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/workspaces/${workspaceId}/history`, {
      method: 'DELETE',
    }),

  // OpenAPI / Swagger
  previewOpenAPI: (spec: string) =>
    fetchJSON<ParsedOpenAPISpec>(`${API_BASE}/openapi/preview`, {
      method: 'POST',
      body: JSON.stringify({ spec }),
    }),
  importOpenAPI: (workspaceId: string, spec?: string, collectionName?: string, url?: string) =>
    fetchJSON<any>(`${API_BASE}/workspaces/${workspaceId}/openapi/import`, {
      method: 'POST',
      body: JSON.stringify({ spec, collectionName, url }),
    }),
  exportOpenAPI: (collectionId: string) =>
    fetchJSON<any>(`${API_BASE}/collections/${collectionId}/openapi/export`),

  // SDK Generator
  generateSDK: (collectionId: string, lang: string) =>
    fetchJSON<{ language: string; filename: string; collectionName: string; code: string }>(
      `${API_BASE}/collections/${collectionId}/sdk?lang=${lang}`
    ),

  // Monitoring
  getMetrics: (workspaceId?: string) =>
    fetchJSON<MetricsSummary>(
      workspaceId
        ? `${API_BASE}/monitoring/metrics?workspaceId=${encodeURIComponent(workspaceId)}`
        : `${API_BASE}/monitoring/metrics`
    ),

  // Workspace Invitations & Links
  createInvite: (workspaceId: string, data: { role?: string; targetEmail?: string }) =>
    fetchJSON<{ invite: any; inviteUrl: string; inviteCode: string }>(
      `${API_BASE}/workspaces/${workspaceId}/invites`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  listInvites: (workspaceId: string) =>
    fetchJSON<any[]>(`${API_BASE}/workspaces/${workspaceId}/invites`),

  getInviteDetails: (inviteCode: string) =>
    fetchJSON<any>(`${API_BASE}/invites/${inviteCode}`),

  acceptInvite: (inviteCode: string) =>
    fetchJSON<{ message: string; workspaceId: string; workspace: Workspace; member: WorkspaceMember }>(
      `${API_BASE}/invites/${inviteCode}/accept`,
      {
        method: 'POST',
      }
    ),

  getUserInvitations: () =>
    fetchJSON<any[]>(`${API_BASE}/user/invitations`),

  // Request Comments & Collaboration
  getComments: (requestId: string) =>
    fetchJSON<RequestComment[]>(`${API_BASE}/requests/${requestId}/comments`),
  addComment: (requestId: string, data: { content: string; parentId?: string; statusCode?: number }) =>
    fetchJSON<RequestComment>(`${API_BASE}/requests/${requestId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleResolveComment: (commentId: string, status: 'open' | 'resolved') =>
    fetchJSON<RequestComment>(`${API_BASE}/comments/${commentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteComment: (commentId: string) =>
    fetchJSON<{ message: string }>(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE',
    }),
};
