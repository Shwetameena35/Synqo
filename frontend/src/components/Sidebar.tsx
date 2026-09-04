import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Server,
  History,
  BookOpen,
  Code2,
  Activity,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Trash2,
  Play,
  Zap,
} from 'lucide-react';
import { CollectionWithTree, RequestItem, MockEndpoint, TestHistory } from '../types';

export type SidebarTab = 'collections' | 'mocks' | 'history' | 'docs' | 'sdk' | 'monitoring';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  collections: CollectionWithTree[];
  selectedRequestId: string | null;
  onSelectRequest: (req: RequestItem) => void;
  onDeleteRequest: (id: string) => void;
  onCreateCollection: () => void;
  onDeleteCollection?: (id: string) => void;
  onCreateRequestInCollection?: (collectionId: string) => void;
  mocks: MockEndpoint[];
  onSelectMock: (mock: MockEndpoint) => void;
  history: TestHistory[];
  onSelectHistoryItem: (item: TestHistory) => void;
  onClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collections,
  selectedRequestId,
  onSelectRequest,
  onDeleteRequest,
  onCreateCollection,
  onDeleteCollection,
  onCreateRequestInCollection,
  mocks,
  onSelectMock,
  history,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('layout_drawer_width');
    return saved ? parseInt(saved, 10) : 288;
  });
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDrawer) return;
      // Rail width is 224px (w-56) if expanded, 64px (w-16) if collapsed
      const railWidth = isExpanded ? 224 : 64;
      const newWidth = e.clientX - railWidth;
      if (newWidth >= 180 && newWidth <= 500) {
        setDrawerWidth(newWidth);
        localStorage.setItem('layout_drawer_width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      if (isDraggingDrawer) {
        setIsDraggingDrawer(false);
      }
    };

    if (isDraggingDrawer) {
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
  }, [isDraggingDrawer, isExpanded]);

  const [openCollections, setOpenCollections] = useState<Record<string, boolean>>({
    col_auth: true,
    col_products: true,
    col_orders: true,
  });

  const toggleCollection = (id: string) => {
    setOpenCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'badge-get';
      case 'POST':
        return 'badge-post';
      case 'PUT':
        return 'badge-put';
      case 'PATCH':
        return 'badge-patch';
      case 'DELETE':
        return 'badge-delete';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const navItems: {
    id: SidebarTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    activeClass: string;
    badge?: string;
  }[] = [
      {
        id: 'collections',
        label: 'Collections',
        description: 'API requests & tests',
        icon: FolderTree,
        color: 'text-[#FF6C37]',
        activeClass: 'bg-[#FF6C37]/15 text-[#FF6C37] border-[#FF6C37]/40',
        badge: collections.length > 0 ? `${collections.length}` : undefined,
      },
      {
        id: 'mocks',
        label: 'Mock Servers',
        description: 'Dynamic routes & latency',
        icon: Server,
        color: 'text-[#FF8555]',
        activeClass: 'bg-[#FF6C37]/15 text-[#FF8555] border-[#FF6C37]/40',
        badge: mocks.length > 0 ? `${mocks.length}` : undefined,
      },
      {
        id: 'history',
        label: 'Test History',
        description: 'Execution logs & runs',
        icon: History,
        color: 'text-[#FFA17A]',
        activeClass: 'bg-[#FF6C37]/15 text-[#FFA17A] border-[#FF6C37]/40',
        badge: history.length > 0 ? `${history.length}` : undefined,
      },
      {
        id: 'docs',
        label: 'API Docs',
        description: 'OpenAPI 3.0 / Swagger',
        icon: BookOpen,
        color: 'text-emerald-400',
        activeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        badge: 'OpenAPI',
      },
      {
        id: 'sdk',
        label: 'SDK Studio',
        description: 'Go, TS, Python, Java',
        icon: Code2,
        color: 'text-[#FF6C37]',
        activeClass: 'bg-[#FF6C37]/15 text-[#FF6C37] border-[#FF6C37]/40',
        badge: 'SDK',
      },
      {
        id: 'monitoring',
        label: 'Dashboard',
        description: 'Live metrics & latency',
        icon: Activity,
        color: 'text-[#FF6C37]',
        activeClass: 'bg-[#FF6C37]/15 text-[#FF6C37] border-[#FF6C37]/40',
        badge: 'Live',
      },
    ];

  const hasDrawer = activeTab === 'collections' || activeTab === 'mocks' || activeTab === 'history';

  return (
    <aside className="h-[calc(100vh-3.5rem)] flex border-r border-[#2B2B2B] select-none">
      {/* Primary Navigation Rail */}
      <div
        className={`${isExpanded ? 'w-56' : 'w-14'
          } bg-[#181818] border-r border-[#2B2B2B] flex flex-col justify-between transition-all duration-200 z-20 shrink-0`}
      >
        <div className="py-3 px-2 space-y-1">
          {/* Header */}
          {isExpanded ? (
            <div className="px-2 pb-2 mb-2 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Studio Menu
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                title="Collapse sidebar"
                className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center pb-2 mb-2 border-b border-slate-800/80">
              <button
                onClick={() => setIsExpanded(true)}
                title="Expand sidebar (show names)"
                className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center rounded-xl transition-all cursor-pointer ${isExpanded ? 'px-2.5 py-2 justify-between' : 'p-2.5 justify-center'
                  } ${isActive
                    ? `${item.activeClass} border shadow-sm`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div
                    className={`p-1 rounded-lg shrink-0 ${isActive ? 'bg-slate-900 shadow-sm ' + item.color : 'text-slate-400'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {isExpanded && (
                    <div className="text-left truncate">
                      <div className="text-xs font-semibold leading-tight text-white truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate leading-tight">
                        {item.description}
                      </div>
                    </div>
                  )}
                </div>

                {isExpanded && item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isActive
                        ? 'bg-slate-900 text-white border border-slate-700'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-800'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Toggle */}
        <div className="p-2 border-t border-slate-800/80">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center ${isExpanded ? 'justify-start space-x-2 px-2.5' : 'justify-center'
              } py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-900/80 transition-colors cursor-pointer`}
          >
            {isExpanded ? (
              <>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="text-[11px]">Collapse Menu</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Secondary Drawer Panel */}
      {hasDrawer && (
        <div
          style={{ width: `${drawerWidth}px` }}
          className="bg-[#1C1C1C] flex flex-col h-full overflow-hidden border-r border-[#2B2B2B] relative shrink-0"
        >
          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Collections</span>
                <button
                  onClick={onCreateCollection}
                  title="Create New Collection"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Search Input */}
              <div className="px-3 py-2 border-b border-slate-800/60">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Collections List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {collections.map((col) => {
                  const isOpen = openCollections[col.id] ?? true;
                  const filteredRequests = (col.requests || []).filter(
                    (r) =>
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.url.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (searchQuery && filteredRequests.length === 0) return null;

                  return (
                    <div key={col.id} className="group/col rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCollection(col.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{col.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                            {col.requests?.length || 0}
                          </span>
                          {onCreateRequestInCollection && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOpen) toggleCollection(col.id);
                                onCreateRequestInCollection(col.id);
                              }}
                              title={`Add new request to "${col.name}"`}
                              className="opacity-0 group-hover/col:opacity-100 p-1 hover:text-[#FF6C37] text-neutral-400 hover:bg-[#FF6C37]/15 rounded transition-all cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {onDeleteCollection && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete collection "${col.name}" and all its requests?`)) {
                                  onDeleteCollection(col.id);
                                }
                              }}
                              title={`Delete collection "${col.name}"`}
                              className="opacity-0 group-hover/col:opacity-100 p-1 hover:text-rose-400 text-neutral-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-neutral-800 ml-3.5">
                          {filteredRequests.length === 0 && (
                            <button
                              onClick={() => onCreateRequestInCollection && onCreateRequestInCollection(col.id)}
                              className="w-full text-left px-2 py-1.5 text-[11px] text-[#FF6C37] hover:underline flex items-center space-x-1.5 opacity-80 hover:opacity-100 cursor-pointer font-medium"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add request to {col.name}</span>
                            </button>
                          )}
                          {filteredRequests.map((req) => {
                            const isSelected = selectedRequestId === req.id;
                            return (
                              <div
                                key={req.id}
                                onClick={() => onSelectRequest(req)}
                                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${isSelected
                                    ? 'bg-[#FF6C37]/15 text-[#FF8555] font-semibold border border-[#FF6C37]/40'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                                  }`}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span
                                    className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider shrink-0 ${getMethodBadgeClass(
                                      req.method
                                    )}`}
                                  >
                                    {req.method}
                                  </span>
                                  <span className="truncate">{req.name}</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRequest(req.id);
                                  }}
                                  title="Delete Request"
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mock Servers Tab */}
          {activeTab === 'mocks' && (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-slate-800/80">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Mock Endpoints</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Live endpoints returning simulated responses</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {mocks.map((mock) => (
                  <div
                    key={mock.id}
                    onClick={() => onSelectMock(mock)}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getMethodBadgeClass(
                          mock.method
                        )}`}
                      >
                        {mock.method}
                      </span>
                      <span className="text-[10px] text-purple-400 font-mono flex items-center space-x-1">
                        <Zap className="h-2.5 w-2.5" />
                        <span>{mock.hitCount} hits</span>
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{mock.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{mock.path}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Test History</span>
                {history.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">No requests executed yet</div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectHistoryItem(item)}
                      className="p-2 rounded-md bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800/60 cursor-pointer text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase ${getMethodBadgeClass(
                            item.method
                          )}`}
                        >
                          {item.method}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold px-1 rounded ${item.statusCode >= 200 && item.statusCode < 300
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                            }`}
                        >
                          {item.statusCode}
                        </span>
                      </div>
                      <div className="text-slate-300 font-mono text-[11px] truncate">{item.url}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{item.latencyMs}ms</span>
                        <span>{new Date(item.executedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Drawer Resize Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingDrawer(true);
            }}
            className={`absolute top-0 right-0 w-1.5 h-full hover:w-2 hover:bg-[#FF6C37]/80 transition-all cursor-col-resize z-20 group flex items-center justify-center select-none ${isDraggingDrawer ? 'bg-[#FF6C37] w-2 shadow-lg shadow-orange-500/40' : 'bg-transparent'
              }`}
            title="Drag left/right to resize sidebar panel"
          >
            <div className="h-8 w-0.5 rounded-full bg-neutral-600/40 group-hover:bg-white" />
          </div>
        </div>
      )}
    </aside>
  );
};
