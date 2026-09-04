import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer';
import { MockStudio } from './components/MockStudio/MockStudio';
import { OpenApiDocs } from './components/OpenApiDocs/OpenApiDocs';
import { SdkStudio } from './components/SdkStudio/SdkStudio';
import { MonitoringDashboard } from './components/Monitoring/MonitoringDashboard';
import { EnvironmentModal } from './components/Environments/EnvironmentModal';
import { ImportModal } from './components/OpenApiDocs/ImportModal';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthPage } from './components/Auth/AuthPage';
import { TeamModal } from './components/Team/TeamModal';
import { JoinInvitePage } from './components/Team/JoinInvitePage';
import { api } from './services/api';
import { realtime, WSMessage } from './services/websocket';
import {
  Workspace,
  CollectionWithTree,
  RequestItem,
  Environment,
  MockEndpoint,
  TestHistory,
  ExecuteResponsePayload,
  User,
  WorkspaceMember,
} from './types';

export function App() {
  // State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [collections, setCollections] = useState<CollectionWithTree[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment | null>(null);
  const [mocks, setMocks] = useState<MockEndpoint[]>([]);
  const [history, setHistory] = useState<TestHistory[]>([]);

  // User & Team Collaboration
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (saved && token) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [response, setResponse] = useState<ExecuteResponsePayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // URL Routing & Active Tab
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path: string): SidebarTab => {
    if (path.startsWith('/mocks')) return 'mocks';
    if (path.startsWith('/history')) return 'history';
    if (path.startsWith('/docs')) return 'docs';
    if (path.startsWith('/sdk')) return 'sdk';
    if (path.startsWith('/monitoring')) return 'monitoring';
    return 'collections';
  };

  const activeTab = getTabFromPath(location.pathname);

  // Sync route on mount and session state change
  useEffect(() => {
    if (location.pathname.startsWith('/join/')) {
      return;
    }
    if (!currentUser && !isDemoMode) {
      if (location.pathname !== '/login' && location.pathname !== '/') {
        navigate('/login', { replace: true });
      }
    } else {
      if (location.pathname === '/' || location.pathname === '/login') {
        navigate('/collections', { replace: true });
      }
    }
  }, [currentUser, isDemoMode, location.pathname, navigate]);

  // Invitations & Notifications
  const [invitations, setInvitations] = useState<any[]>([]);

  const loadInvitations = () => {
    if (currentUser && !isDemoMode) {
      api.getUserInvitations().then(setInvitations).catch(() => {});
    } else {
      setInvitations([]);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [currentUser, isDemoMode]);

  const handleAcceptInvitation = async (code: string) => {
    try {
      const res = await api.acceptInvite(code);
      const wsList = await api.getWorkspaces();
      setWorkspaces(wsList);
      const joinedWs = wsList.find((w: Workspace) => w.id === res.workspaceId);
      if (joinedWs) {
        setCurrentWorkspace(joinedWs);
        localStorage.setItem('active_workspace_id', joinedWs.id);
        loadWorkspaceData(joinedWs.id);
      }
      loadInvitations();
      navigate('/collections');
    } catch (err: any) {
      alert(err.message || 'Failed to accept invitation');
    }
  };

  // Realtime
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; userName: string }[]>([]);

  // Modals
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Adjustable Layout Split (Request vs Response)
  const [requestPanelWidth, setRequestPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('layout_request_panel_width');
    return saved ? parseFloat(saved) : 50;
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit) return;
      const container = document.getElementById('main-split-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = (offsetX / rect.width) * 100;
      if (percentage >= 20 && percentage <= 80) {
        setRequestPanelWidth(percentage);
        localStorage.setItem('layout_request_panel_width', percentage.toString());
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSplit) {
        setIsDraggingSplit(false);
      }
    };

    if (isDraggingSplit) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSplit]);

  const handleSelectWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    localStorage.setItem('active_workspace_id', ws.id);
  };

  // 1. Load workspaces for authenticated user or demo mode
  useEffect(() => {
    if (currentUser || isDemoMode) {
      api
        .getWorkspaces()
        .then((wsList) => {
          setWorkspaces(wsList);
          if (wsList.length > 0) {
            const savedWsId = localStorage.getItem('active_workspace_id');
            const matchedSavedWs = savedWsId ? wsList.find((w) => w.id === savedWsId) : null;
            const personalWs = wsList.find((w) => w.ownerId === currentUser?.id);
            const targetWs = matchedSavedWs || personalWs || wsList[0];
            setCurrentWorkspace(targetWs);
            localStorage.setItem('active_workspace_id', targetWs.id);
          } else {
            setCurrentWorkspace(null);
          }
        })
        .catch(console.error);
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
    }
  }, [currentUser, isDemoMode]);

  // 2. Load workspace data when workspace changes
  const loadWorkspaceData = (wsId: string) => {
    // Collections & Requests
    api.getCollections(wsId).then((cols) => {
      setCollections(cols);
      if (cols.length > 0 && cols[0].requests?.length > 0 && !selectedRequest) {
        setSelectedRequest(cols[0].requests[0]);
      }
    });

    // Environments
    api.getEnvironments(wsId).then((envs) => {
      setEnvironments(envs);
      const def = envs.find((e) => e.isDefault) || envs[0] || null;
      setCurrentEnvironment(def);
    });

    // Mocks
    api.getMocks(wsId).then(setMocks);

    // History
    api.getHistory(wsId).then(setHistory);

    // Team Members
    api.getMembers(wsId).then(setMembers).catch(console.error);
  };

  useEffect(() => {
    if (currentWorkspace) {
      loadWorkspaceData(currentWorkspace.id);

      // Connect WebSocket with current user
      realtime.connect(currentWorkspace.id, currentUser?.name || 'Developer');
      const unsubscribeStatus = realtime.onStatusChange(setIsConnected);

      const unsubscribeMessages = realtime.subscribe((msg: WSMessage) => {
        if (msg.type === 'presence_list' && Array.isArray(msg.payload)) {
          setOnlineUsers(msg.payload);
        }
      });

      return () => {
        unsubscribeStatus();
        unsubscribeMessages();
      };
    }
  }, [currentWorkspace, currentUser]);

  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsDemoMode(false);
    setShowAuthModal(false);
    navigate('/collections');
  };

  const handleExploreDemo = () => {
    setIsDemoMode(true);
    const demoUser: User = {
      id: 'usr_demo_1',
      name: 'Demo Visitor',
      email: 'guest@apihub.dev',
      role: 'developer',
    };
    setCurrentUser(demoUser);
    navigate('/collections');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('active_workspace_id');
    setCurrentUser(null);
    setIsDemoMode(false);
    setCurrentWorkspace(null);
    setWorkspaces([]);
    setCollections([]);
    setSelectedRequest(null);
    setResponse(null);
    setShowAuthModal(false);
    navigate('/login');
  };

  // Handle Execute Request
  const handleSendRequest = async (payload: any) => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      const res = await api.executeRequest({
        ...payload,
        workspaceId: currentWorkspace.id,
        environmentId: currentEnvironment?.id,
      });
      setResponse(res);
      // Reload history
      api.getHistory(currentWorkspace.id).then(setHistory);
    } catch (err: any) {
      setResponse({
        statusCode: 500,
        statusText: 'Client Error',
        latencyMs: 0,
        responseSize: 0,
        headers: {},
        body: err.message,
        assertionsPassed: 0,
        assertionsTotal: 0,
        assertionDetails: [],
        historyId: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Save Request
  const handleSaveRequest = async (reqData: Partial<RequestItem>) => {
    if (!currentWorkspace) return;

    if (reqData.id && reqData.id.startsWith('req_')) {
      const updated = await api.updateRequest(reqData.id, reqData);
      setSelectedRequest(updated);
    } else {
      const targetColId = collections[0]?.id;
      if (!targetColId) return;
      const created = await api.createRequest({
        ...reqData,
        workspaceId: currentWorkspace.id,
        collectionId: targetColId,
      });
      setSelectedRequest(created);
    }
    loadWorkspaceData(currentWorkspace.id);
  };

  // Create new blank request
  const handleNewRequest = () => {
    if (!currentWorkspace || collections.length === 0) return;
    const newReq: RequestItem = {
      id: `req_temp_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      collectionId: collections[0].id,
      name: 'New Untitled Request',
      method: 'GET',
      url: '{{baseUrl}}/users',
      headers: '[]',
      params: '[]',
      bodyType: 'none',
      bodyContent: '',
      authType: 'none',
      authConfig: '{}',
      tests: '[{"type": "status_code", "operator": "equals", "value": "200"}]',
      orderIndex: 99,
    };
    setSelectedRequest(newReq);
    setResponse(null);
    navigate('/collections');
  };

  // Delete request
  const handleDeleteRequest = async (id: string) => {
    if (confirm('Delete this request?')) {
      await api.deleteRequest(id);
      if (currentWorkspace) loadWorkspaceData(currentWorkspace.id);
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
        setResponse(null);
      }
    }
  };

  // Create new collection
  const handleCreateCollection = async () => {
    if (!currentWorkspace) return;
    const name = prompt('Enter new Collection Name:');
    if (!name?.trim()) return;
    await api.createCollection(currentWorkspace.id, {
      name: name.trim(),
      description: 'API endpoint collection',
    });
    loadWorkspaceData(currentWorkspace.id);
  };

  // Delete collection
  const handleDeleteCollection = async (id: string) => {
    try {
      await api.deleteCollection(id);
      if (currentWorkspace) loadWorkspaceData(currentWorkspace.id);
      if (selectedRequest?.collectionId === id) {
        setSelectedRequest(null);
        setResponse(null);
      }
    } catch (err: any) {
      alert('Error deleting collection: ' + err.message);
    }
  };

  // Try endpoint in runner
  const handleTryInRunner = (method: string, url: string, body?: string) => {
    setSelectedRequest({
      id: `req_runner_${Date.now()}`,
      workspaceId: currentWorkspace?.id || '',
      collectionId: collections[0]?.id || '',
      name: `Test ${method} ${url}`,
      method,
      url,
      headers: '[]',
      params: '[]',
      bodyType: body ? 'json' : 'none',
      bodyContent: body || '',
      authType: 'none',
      authConfig: '{}',
      tests: '[{"type": "status_code", "operator": "equals", "value": "200"}]',
      orderIndex: 0,
    });
    navigate('/collections');
  };

  // Handle join route
  const isJoinRoute = location.pathname.startsWith('/join/');
  const inviteCode = isJoinRoute ? location.pathname.split('/join/')[1] : null;

  if (isJoinRoute && inviteCode) {
    return (
      <JoinInvitePage
        inviteCode={inviteCode}
        currentUser={currentUser}
        onJoinSuccess={(workspaceId) => {
          api.getWorkspaces().then((wsList) => {
            setWorkspaces(wsList);
            const joinedWs = wsList.find((w: Workspace) => w.id === workspaceId);
            if (joinedWs) {
              setCurrentWorkspace(joinedWs);
              localStorage.setItem('active_workspace_id', joinedWs.id);
              loadWorkspaceData(joinedWs.id);
            }
            loadInvitations();
            navigate('/collections');
          });
        }}
        onLoginSuccess={handleLoginSuccess}
        onGoHome={() => navigate('/collections')}
      />
    );
  }

  // If not logged in and not exploring demo, show dedicated full-screen Landing / Auth Page
  if (!currentUser && !isDemoMode) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onExploreDemo={handleExploreDemo}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#141414] font-sans">
      {/* Top Navbar */}
      <Navbar
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={async (name, description) => {
          const ws = await api.createWorkspace({ name, description });
          setWorkspaces([...workspaces, ws]);
          setCurrentWorkspace(ws);
          localStorage.setItem('active_workspace_id', ws.id);
        }}
        environments={environments}
        currentEnvironment={currentEnvironment}
        onSelectEnvironment={setCurrentEnvironment}
        onOpenEnvModal={() => setShowEnvModal(true)}
        onOpenImportModal={() => setShowImportModal(true)}
        onNewRequest={handleNewRequest}
        isConnected={isConnected}
        onlineUsers={onlineUsers}
        currentUser={currentUser}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenTeamModal={() => setShowTeamModal(true)}
        onLogout={handleLogout}
        membersCount={members.length}
        invitations={invitations}
        onAcceptInvite={handleAcceptInvitation}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => navigate(`/${tab}`)}
          collections={collections}
          selectedRequestId={selectedRequest?.id || null}
          onSelectRequest={(req) => {
            setSelectedRequest(req);
            navigate('/collections');
          }}
          onDeleteRequest={handleDeleteRequest}
          onCreateCollection={handleCreateCollection}
          onDeleteCollection={handleDeleteCollection}
          mocks={mocks}
          onSelectMock={() => {
            navigate('/mocks');
          }}
          history={history}
          onSelectHistoryItem={(item) => {
            setSelectedRequest({
              id: item.requestItemId || `hist_req_${item.id}`,
              workspaceId: item.workspaceId,
              collectionId: collections[0]?.id || '',
              name: item.requestName || 'Historical Execution',
              method: item.method,
              url: item.url,
              headers: item.responseHeaders,
              params: '[]',
              bodyType: 'none',
              bodyContent: '',
              authType: 'none',
              authConfig: '{}',
              tests: item.assertionDetails || '[]',
              orderIndex: 0,
            });
            setResponse({
              statusCode: item.statusCode,
              statusText: item.statusText,
              latencyMs: item.latencyMs,
              responseSize: item.responseSize,
              headers: JSON.parse(item.responseHeaders || '{}'),
              body: item.responseBody || '',
              assertionsPassed: item.assertionsPassed,
              assertionsTotal: item.assertionsTotal,
              assertionDetails: JSON.parse(item.assertionDetails || '[]'),
              historyId: item.id,
            });
            navigate('/collections');
          }}
          onClearHistory={async () => {
            if (currentWorkspace) {
              await api.clearHistory(currentWorkspace.id);
              setHistory([]);
            }
          }}
        />

        {/* Center / Right Content Panels */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'collections' || activeTab === 'history' ? (
            <div id="main-split-container" className="flex-1 flex overflow-hidden relative">
              {/* Left: Request Builder */}
              <div
                style={{ width: `${requestPanelWidth}%` }}
                className="h-full overflow-hidden shrink-0 flex flex-col"
              >
                <RequestBuilder
                  request={selectedRequest}
                  onSend={handleSendRequest}
                  onSave={handleSaveRequest}
                  isLoading={isLoading}
                  onOpenSdkModal={() => navigate('/sdk')}
                />
              </div>

              {/* Adjustable Divider Bar */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDraggingSplit(true);
                }}
                onDoubleClick={() => {
                  setRequestPanelWidth(50);
                  localStorage.setItem('layout_request_panel_width', '50');
                }}
                className={`w-1.5 hover:w-2 hover:bg-[#FF6C37]/80 bg-[#2B2B2B] transition-all cursor-col-resize shrink-0 relative group flex items-center justify-center z-10 select-none ${
                  isDraggingSplit ? 'bg-[#FF6C37] w-2 shadow-lg shadow-orange-500/40' : ''
                }`}
                title="Drag to resize panels • Double-click to reset 50/50"
              >
                <div className="h-8 w-0.5 rounded-full bg-neutral-600 group-hover:bg-white" />
              </div>

              {/* Right: Response Viewer */}
              <div
                style={{ width: `${100 - requestPanelWidth}%` }}
                className="h-full overflow-hidden flex-1 flex flex-col"
              >
                <ResponseViewer response={response} isLoading={isLoading} />
              </div>
            </div>
          ) : activeTab === 'mocks' ? (
            <MockStudio
              workspaceId={currentWorkspace?.id || ''}
              mocks={mocks}
              onRefreshMocks={() => currentWorkspace && api.getMocks(currentWorkspace.id).then(setMocks)}
              onTryInRunner={handleTryInRunner}
            />
          ) : activeTab === 'docs' ? (
            <OpenApiDocs
              collections={collections}
              onTryInRunner={handleTryInRunner}
              onOpenImportModal={() => setShowImportModal(true)}
            />
          ) : activeTab === 'sdk' ? (
            <SdkStudio collections={collections} />
          ) : (
            <MonitoringDashboard
              workspaceId={currentWorkspace?.id || ''}
              workspaceName={currentWorkspace?.name}
              onGoToRunner={() => navigate('/collections')}
            />
          )}
        </main>
      </div>

      {/* Environment Modal */}
      <EnvironmentModal
        isOpen={showEnvModal}
        onClose={() => setShowEnvModal(false)}
        workspaceId={currentWorkspace?.id || ''}
        environments={environments}
        currentEnvironment={currentEnvironment}
        onRefreshEnvironments={() =>
          currentWorkspace && api.getEnvironments(currentWorkspace.id).then(setEnvironments)
        }
        onSelectEnvironment={setCurrentEnvironment}
      />

      {/* OpenAPI Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        workspaceId={currentWorkspace?.id || ''}
        onImportSuccess={() => currentWorkspace && loadWorkspaceData(currentWorkspace.id)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={async (user) => {
          setCurrentUser(user);
          try {
            const wsList = await api.getWorkspaces();
            setWorkspaces(wsList);
            const userWs = wsList.find((w) => w.ownerId === user.id) || wsList[0];
            if (userWs) {
              setCurrentWorkspace(userWs);
            }
          } catch (e) {
            console.error('Error refreshing workspaces after login', e);
          }
        }}
      />

      {/* Team Management Modal */}
      <TeamModal
        isOpen={showTeamModal}
        onClose={() => {
          setShowTeamModal(false);
          if (currentWorkspace) {
            api.getMembers(currentWorkspace.id).then(setMembers).catch(console.error);
          }
        }}
        workspaceId={currentWorkspace?.id || ''}
        currentUser={currentUser}
      />
    </div>
  );
}

export default App;
