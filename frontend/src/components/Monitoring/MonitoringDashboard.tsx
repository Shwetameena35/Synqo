import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  Server,
  Play,
} from 'lucide-react';
import { MetricsSummary } from '../../types';
import { api } from '../../services/api';

interface MonitoringDashboardProps {
  workspaceId?: string;
  workspaceName?: string;
  onGoToRunner?: () => void;
}

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
      return 'bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30';
  }
};

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  workspaceId,
  workspaceName,
  onGoToRunner,
}) => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = () => {
    setLoading(true);
    api
      .getMetrics(workspaceId)
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  if (!metrics) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500 space-x-2 bg-[#141414]">
        <div className="h-5 w-5 border-2 border-[#FF6C37] border-t-transparent rounded-full animate-spin" />
        <span className="font-game text-xs tracking-wider uppercase">Loading telemetry stream...</span>
      </div>
    );
  }

  const successRate = metrics.totalRequests > 0 ? (100 - metrics.errorRate).toFixed(1) : '100.0';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-y-auto">
      {/* Top Banner */}
      <div className="p-4 border-b border-[#2B2B2B] bg-[#181818] flex items-center justify-between select-none">
        <div>
          <div className="font-game text-sm font-black text-white flex items-center space-x-2.5 tracking-wider">
            <Activity className="h-4 w-4 text-[#FF6C37]" />
            <span>API TELEMETRY & MONITORING</span>
            <span className="font-game text-[10px] px-2 py-0.5 rounded-full bg-[#FF6C37]/15 text-[#FF6C37] border border-[#FF6C37]/30 font-bold tracking-widest uppercase">
              {workspaceName ? `${workspaceName} Stream` : 'Live Stream'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-medium tracking-wide">
            Real-time throughput, latency distribution percentiles, and error rate tracking.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="font-game flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#333333] text-xs font-bold text-neutral-200 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#FF6C37]' : 'text-neutral-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {metrics.totalRequests === 0 && (
        <div className="mx-6 mt-6 p-6 rounded-2xl bg-[#1E1E1E] border border-[#2B2B2B] text-center space-y-3 shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-[#FF6C37]/10 border border-[#FF6C37]/25 text-[#FF6C37] flex items-center justify-center mx-auto">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="font-game text-sm font-bold text-white uppercase tracking-wider">
            No Telemetry Recorded Yet for {workspaceName || 'this workspace'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            This workspace is brand new! Metrics will start streaming here automatically as soon as you execute API requests in the Request Runner or call your dynamic mock endpoints.
          </p>
          {onGoToRunner && (
            <button
              onClick={onGoToRunner}
              className="font-game inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#FF6C37] hover:bg-[#FF5216] active:bg-[#E5450B] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-600/30 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Go to Request Runner</span>
            </button>
          )}
        </div>
      )}

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-2 shadow-sm hover:border-[#FF6C37]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
              <span className="font-game text-[11px] uppercase tracking-wider">Total Requests</span>
              <Activity className="h-4 w-4 text-[#FF6C37]" />
            </div>
            <div className="font-game text-2xl font-black text-white">{metrics.totalRequests}</div>
            <div className="text-[11px] text-[#FF6C37] flex items-center space-x-1 font-semibold">
              <TrendingUp className="h-3 w-3" />
              <span>Throughput tracking active</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-2 shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
              <span className="font-game text-[11px] uppercase tracking-wider">Success Rate</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="font-game text-2xl font-black text-emerald-400">{successRate}%</div>
            <div className="text-[11px] text-neutral-400 font-medium">
              {metrics.totalErrors} errors encountered
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-2 shadow-sm hover:border-purple-400/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
              <span className="font-game text-[11px] uppercase tracking-wider">Avg Latency</span>
              <Clock className="h-4 w-4 text-purple-400" />
            </div>
            <div className="font-game text-2xl font-black text-white">{metrics.avgLatencyMs} ms</div>
            <div className="text-[11px] text-purple-400 font-mono font-semibold">
              P50: {metrics.p50LatencyMs}ms
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-2 shadow-sm hover:border-amber-400/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
              <span className="font-game text-[11px] uppercase tracking-wider">P95 / P99 Latency</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="font-game text-2xl font-black text-amber-400">{metrics.p95LatencyMs} ms</div>
            <div className="text-[11px] text-neutral-400 font-mono font-semibold">
              P99: {metrics.p99LatencyMs}ms
            </div>
          </div>
        </div>

        {/* Status Distribution & Traffic Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Traffic Timeline Chart */}
          <div className="lg:col-span-8 p-5 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-game text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Traffic & Latency Timeline
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">5-minute interval buckets</span>
            </div>

            <div className="h-44 flex items-end justify-between space-x-3 pt-6 pb-2 px-2 border-b border-[#2B2B2B]">
              {metrics.recentTimeline.map((item, idx) => {
                const maxReq = Math.max(...metrics.recentTimeline.map((t) => Number(t.requests)), 1);
                const heightPercent = Math.max((Number(item.requests) / maxReq) * 100, 10);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-[#141414] border border-[#FF6C37]/50 px-2 py-1 rounded text-[10px] font-mono text-[#FF6C37] pointer-events-none transition-opacity z-20 whitespace-nowrap shadow-lg">
                      {item.requests} reqs ({item.avgMs}ms)
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${
                        item.errors > 0
                          ? 'bg-gradient-to-t from-rose-600 to-rose-400'
                          : 'bg-gradient-to-t from-[#E5450B] via-[#FF5216] to-[#FF6C37] group-hover:brightness-125 shadow-sm shadow-orange-600/20'
                      }`}
                    />
                    <span className="text-[10px] text-neutral-500 font-mono mt-2">{item.timeLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="lg:col-span-4 p-5 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-4 shadow-sm">
            <span className="font-game text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Status Code Distribution
            </span>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-emerald-400 font-bold">2xx Success</span>
                  <span className="text-neutral-300 font-mono font-bold">{metrics.status2xxCount}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#141414] overflow-hidden border border-[#2B2B2B]">
                  <div
                    style={{
                      width: `${(metrics.status2xxCount / (metrics.totalRequests || 1)) * 100}%`,
                    }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-amber-400 font-bold">4xx Client Errors</span>
                  <span className="text-neutral-300 font-mono font-bold">{metrics.status4xxCount}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#141414] overflow-hidden border border-[#2B2B2B]">
                  <div
                    style={{
                      width: `${(metrics.status4xxCount / (metrics.totalRequests || 1)) * 100}%`,
                    }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-rose-400 font-bold">5xx Server Errors</span>
                  <span className="text-neutral-300 font-mono font-bold">{metrics.status5xxCount}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#141414] overflow-hidden border border-[#2B2B2B]">
                  <div
                    style={{
                      width: `${(metrics.status5xxCount / (metrics.totalRequests || 1)) * 100}%`,
                    }}
                    className="h-full bg-rose-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Active Endpoints */}
        <div className="p-5 rounded-xl bg-[#1E1E1E] border border-[#2B2B2B] space-y-3 shadow-sm">
          <span className="font-game text-xs font-bold text-neutral-200 uppercase tracking-wider">
            Most Active Endpoints
          </span>

          <div className="border border-[#2B2B2B] rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-[#181818] px-4 py-2.5 text-[11px] font-bold text-neutral-400 border-b border-[#2B2B2B] font-game uppercase tracking-wider">
              <div className="col-span-2">Method</div>
              <div className="col-span-6">Endpoint Path</div>
              <div className="col-span-2 text-right">Hit Count</div>
              <div className="col-span-2 text-right">Avg Latency</div>
            </div>

            {metrics.topEndpoints && metrics.topEndpoints.length > 0 ? (
              metrics.topEndpoints.map((ep, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-4 py-2.5 text-xs font-mono border-b border-[#2B2B2B]/60 items-center hover:bg-[#252525] transition-colors"
                >
                  <div className="col-span-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-game uppercase tracking-wider border ${getMethodBadgeClass(ep.method)}`}>
                      {ep.method}
                    </span>
                  </div>
                  <div className="col-span-6 text-neutral-200 truncate">{ep.endpoint}</div>
                  <div className="col-span-2 text-right text-[#FF6C37] font-semibold font-game">
                    {ep.hits} hits
                  </div>
                  <div className="col-span-2 text-right text-emerald-400 font-mono font-semibold">{ep.avgMs} ms</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-neutral-500">No endpoint activity recorded yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
