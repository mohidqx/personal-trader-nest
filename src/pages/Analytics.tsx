import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, BarChart3, Target, Activity,
  Zap, AlertTriangle, Calendar, Award, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  ReferenceLine, ScatterChart, Scatter, ZAxis,
} from "recharts";

interface Trade {
  id: string;
  symbol: string;
  type: string;
  profit: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  volume: number;
  open_price: number;
  close_price: number | null;
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────
function calcDrawdown(trades: Trade[]) {
  let peak = 0;
  let equity = 0;
  const series: { date: string; equity: number; drawdown: number }[] = [];
  const closed = [...trades].filter(t => t.status === "closed" && t.closed_at)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

  closed.forEach(t => {
    equity += t.profit ?? 0;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / peak) * -100 : 0;
    series.push({
      date: new Date(t.closed_at!).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      equity: Math.round(equity * 100) / 100,
      drawdown: Math.round(dd * 100) / 100,
    });
  });
  return { series, maxDrawdown: Math.min(...series.map(s => s.drawdown), 0) };
}

function calcSharpe(trades: Trade[]) {
  const returns = trades.filter(t => t.status === "closed" && t.profit !== null).map(t => t.profit!);
  if (returns.length < 2) return 0;
  const avg = returns.reduce((s, r) => s + r, 0) / returns.length;
  const std = Math.sqrt(returns.map(r => (r - avg) ** 2).reduce((s, v) => s + v, 0) / (returns.length - 1));
  return std > 0 ? Math.round((avg / std) * Math.sqrt(252) * 100) / 100 : 0;
}

function calcStreaks(trades: Trade[]) {
  const closed = [...trades].filter(t => t.status === "closed")
    .sort((a, b) => new Date(a.closed_at ?? "").getTime() - new Date(b.closed_at ?? "").getTime());
  let winStreak = 0, lossStreak = 0, maxWin = 0, maxLoss = 0, cur = 0, type: "w" | "l" | null = null;
  closed.forEach(t => {
    const win = (t.profit ?? 0) > 0;
    if (win) {
      if (type !== "w") { cur = 0; type = "w"; }
      cur++;
      maxWin = Math.max(maxWin, cur);
    } else {
      if (type !== "l") { cur = 0; type = "l"; }
      cur++;
      maxLoss = Math.max(maxLoss, cur);
    }
  });
  winStreak = type === "w" ? cur : 0;
  lossStreak = type === "l" ? cur : 0;
  return { winStreak, lossStreak, maxWin, maxLoss };
}

function calcBySymbol(trades: Trade[]) {
  const map: Record<string, { profit: number; trades: number; wins: number }> = {};
  trades.filter(t => t.status === "closed").forEach(t => {
    if (!map[t.symbol]) map[t.symbol] = { profit: 0, trades: 0, wins: 0 };
    map[t.symbol].profit += t.profit ?? 0;
    map[t.symbol].trades++;
    if ((t.profit ?? 0) > 0) map[t.symbol].wins++;
  });
  return Object.entries(map)
    .map(([symbol, v]) => ({ symbol, ...v, winRate: v.trades ? (v.wins / v.trades) * 100 : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

function calcDayHeatmap(trades: Trade[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map: Record<number, { profit: number; count: number }> = {};
  for (let i = 0; i < 7; i++) map[i] = { profit: 0, count: 0 };
  trades.filter(t => t.status === "closed" && t.closed_at).forEach(t => {
    const d = new Date(t.closed_at!).getDay();
    map[d].profit += t.profit ?? 0;
    map[d].count++;
  });
  return days.map((day, i) => ({ day, ...map[i] }));
}

function calcHourlyPerf(trades: Trade[]) {
  const map: Record<number, { profit: number; count: number }> = {};
  for (let i = 0; i < 24; i++) map[i] = { profit: 0, count: 0 };
  trades.filter(t => t.status === "closed" && t.closed_at).forEach(t => {
    const h = new Date(t.closed_at!).getHours();
    map[h].profit += t.profit ?? 0;
    map[h].count++;
  });
  return Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, ...map[i] })).filter(h => h.count > 0);
}

// ─── MOCK data for demo when no trades ───────────────────────────────────────
function generateMockTrades(): Trade[] {
  const symbols = ["EUR/USD", "GBP/USD", "USD/JPY", "BTC/USD", "XAU/USD", "NASDAQ"];
  const trades: Trade[] = [];
  let d = new Date(); d.setDate(d.getDate() - 90);
  for (let i = 0; i < 80; i++) {
    d = new Date(d.getTime() + Math.random() * 86400000 * 2);
    const profit = (Math.random() - 0.38) * 400;
    trades.push({
      id: `m${i}`, symbol: symbols[Math.floor(Math.random() * symbols.length)],
      type: Math.random() > 0.5 ? "buy" : "sell",
      profit: Math.round(profit * 100) / 100, status: "closed",
      opened_at: d.toISOString(), closed_at: new Date(d.getTime() + Math.random() * 7200000).toISOString(),
      volume: Math.round(Math.random() * 2 * 10) / 10 + 0.1,
      open_price: 1.08, close_price: 1.082,
    });
  }
  return trades;
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color = "primary", delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: any; color?: string; delay?: number;
}) {
  return (
    <div className="card-glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3",
        color === "success" ? "bg-success/15 text-success" :
        color === "destructive" ? "bg-destructive/15 text-destructive" :
        color === "warning" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={cn("text-xl font-bold font-mono",
        color === "success" ? "text-success" :
        color === "destructive" ? "text-destructive" :
        color === "warning" ? "text-warning" : "text-foreground"
      )}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setTrades(generateMockTrades()); setUsingMock(true); setLoading(false); return; }
      const { data } = await supabase.from("trades").select("*").eq("user_id", session.user.id);
      if (!data || data.length === 0) { setTrades(generateMockTrades()); setUsingMock(true); }
      else setTrades(data as Trade[]);
      setLoading(false);
    };
    init();
  }, []);

  // ─── Computed analytics ─────────────────────────────────────────────────────
  const closed = useMemo(() => trades.filter(t => t.status === "closed"), [trades]);
  const wins = useMemo(() => closed.filter(t => (t.profit ?? 0) > 0), [closed]);
  const losses = useMemo(() => closed.filter(t => (t.profit ?? 0) <= 0), [closed]);
  const totalPnL = useMemo(() => closed.reduce((s, t) => s + (t.profit ?? 0), 0), [closed]);
  const winRate = useMemo(() => closed.length ? (wins.length / closed.length) * 100 : 0, [wins, closed]);
  const avgWin = useMemo(() => wins.length ? wins.reduce((s, t) => s + (t.profit ?? 0), 0) / wins.length : 0, [wins]);
  const avgLoss = useMemo(() => losses.length ? losses.reduce((s, t) => s + (t.profit ?? 0), 0) / losses.length : 0, [losses]);
  const profitFactor = useMemo(() => Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0, [avgWin, avgLoss]);
  const sharpe = useMemo(() => calcSharpe(trades), [trades]);
  const { series: drawSeries, maxDrawdown } = useMemo(() => calcDrawdown(trades), [trades]);
  const streaks = useMemo(() => calcStreaks(trades), [trades]);
  const bySymbol = useMemo(() => calcBySymbol(trades), [trades]);
  const dayData = useMemo(() => calcDayHeatmap(trades), [trades]);
  const hourData = useMemo(() => calcHourlyPerf(trades), [trades]);

  // Equity curve
  const equityCurve = useMemo(() => drawSeries.map(s => ({ date: s.date, equity: s.equity })), [drawSeries]);

  if (loading) return (
    <AppLayout title="Analytics">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Analytics" subtitle="Deep portfolio insights & performance metrics">
      {usingMock && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Showing simulated data — connect your trading account to see real analytics.
        </div>
      )}

      {/* ─── Key Metrics ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <MetricCard label="Total P&L" value={`${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`} icon={TrendingUp} color={totalPnL >= 0 ? "success" : "destructive"} delay={0} />
        <MetricCard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={Target} color={winRate >= 55 ? "success" : "warning"} delay={40} />
        <MetricCard label="Sharpe Ratio" value={sharpe.toFixed(2)} sub="Risk-adj. return" icon={Activity} color={sharpe >= 1 ? "success" : sharpe >= 0 ? "warning" : "destructive"} delay={80} />
        <MetricCard label="Profit Factor" value={profitFactor.toFixed(2)} sub="Win/Loss ratio" icon={BarChart3} color={profitFactor >= 1.5 ? "success" : "warning"} delay={120} />
        <MetricCard label="Max Drawdown" value={`${maxDrawdown.toFixed(1)}%`} icon={AlertTriangle} color={Math.abs(maxDrawdown) > 20 ? "destructive" : "warning"} delay={160} />
        <MetricCard label="Avg Win" value={`+$${avgWin.toFixed(2)}`} icon={TrendingUp} color="success" delay={200} />
        <MetricCard label="Avg Loss" value={`$${avgLoss.toFixed(2)}`} icon={TrendingDown} color="destructive" delay={240} />
        <MetricCard label="Total Trades" value={closed.length} sub={`${trades.filter(t => t.status === "open").length} open`} icon={Zap} delay={280} />
      </div>

      {/* ─── Equity Curve + Drawdown ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Equity Curve</span>
            <Badge variant="secondary" className="ml-auto text-xs">{equityCurve.length} trades</Badge>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(189 100% 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(189 100% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 58%)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={55} />
                <ReferenceLine y={0} stroke="hsl(222 18% 30%)" strokeDasharray="4 4" />
                <Tooltip contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
                <Area type="monotone" dataKey="equity" stroke="hsl(189 100% 48%)" strokeWidth={2} fill="url(#equityGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">Drawdown Curve</span>
            <Badge variant="secondary" className="ml-auto text-xs">Max: {maxDrawdown.toFixed(1)}%</Badge>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawSeries} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 58%)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={45} />
                <ReferenceLine y={0} stroke="hsl(222 18% 30%)" />
                <Tooltip contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, "Drawdown"]} />
                <Area type="monotone" dataKey="drawdown" stroke="hsl(0 84% 60%)" strokeWidth={2} fill="url(#ddGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Streaks + Symbol Performance ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Streak tracker */}
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold">Win/Loss Streaks</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Current Win Streak", value: streaks.winStreak, color: "success", icon: "🔥" },
              { label: "Current Loss Streak", value: streaks.lossStreak, color: "destructive", icon: "❄️" },
              { label: "Best Win Streak", value: streaks.maxWin, color: "success", icon: "🏆" },
              { label: "Worst Loss Streak", value: streaks.maxLoss, color: "destructive", icon: "💔" },
            ].map((s, i) => (
              <div key={i} className={cn("rounded-xl p-3 border text-center",
                s.color === "success" ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"
              )}>
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className={cn("text-xl font-bold font-mono", s.color === "success" ? "text-success" : "text-destructive")}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Win vs Loss donut-style */}
          <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-around">
            <div className="text-center">
              <p className="text-lg font-bold text-success font-mono">{wins.length}</p>
              <p className="text-[10px] text-muted-foreground">Wins</p>
            </div>
            <div className="flex-1 mx-3 h-2 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-success to-success/60 rounded-full transition-all duration-1000"
                style={{ width: `${winRate}%` }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-destructive font-mono">{losses.length}</p>
              <p className="text-[10px] text-muted-foreground">Losses</p>
            </div>
          </div>
        </div>

        {/* Best/Worst symbols */}
        <div className="xl:col-span-2 card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Performance by Symbol</span>
          </div>
          {bySymbol.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No closed trades yet</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySymbol.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 60 }}>
                  <XAxis type="number" tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="symbol" tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
                  <Tooltip contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(v: number) => [`${v >= 0 ? "+" : ""}$${v.toFixed(2)}`, "P&L"]} />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                    {bySymbol.slice(0, 10).map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? "hsl(142 76% 45%)" : "hsl(0 84% 60%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ─── Day of Week Heatmap + Hourly ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">P&L by Day of Week</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "hsl(215 20% 58%)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={45} />
                <ReferenceLine y={0} stroke="hsl(222 18% 30%)" />
                <Tooltip contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number, _n, props) => [`${v >= 0 ? "+" : ""}$${v.toFixed(2)} (${props.payload.count} trades)`, "P&L"]} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {dayData.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? "hsl(142 76% 45%)" : "hsl(0 84% 60%)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly performance */}
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Hourly Performance (UTC)</span>
          </div>
          {hourData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "hsl(215 20% 58%)", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={45} />
                  <ReferenceLine y={0} stroke="hsl(222 18% 30%)" />
                  <Tooltip contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(v: number) => [`${v >= 0 ? "+" : ""}$${v.toFixed(2)}`, "P&L"]} />
                  <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
                    {hourData.map((h, i) => <Cell key={i} fill={h.profit >= 0 ? "hsl(189 100% 48%)" : "hsl(0 84% 60%)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No hourly data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Risk Metrics Table ────────────────────────────────────────────── */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Advanced Risk Metrics</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
          {[
            { label: "Expectancy", value: `${((avgWin * winRate / 100) + (avgLoss * (1 - winRate / 100))).toFixed(2)}`, desc: "Expected P&L per trade", good: ((avgWin * winRate / 100) + (avgLoss * (1 - winRate / 100))) > 0 },
            { label: "Kelly Criterion", value: `${Math.max(0, (winRate / 100 - (1 - winRate / 100) / Math.abs(avgLoss > 0 ? avgWin / avgLoss : 1)) * 100).toFixed(1)}%`, desc: "Optimal position sizing", good: true },
            { label: "Recovery Factor", value: Math.abs(maxDrawdown) > 0 ? (totalPnL / Math.abs(maxDrawdown)).toFixed(2) : "∞", desc: "P&L / Max Drawdown", good: true },
            { label: "Calmar Ratio", value: Math.abs(maxDrawdown) > 0 ? (totalPnL / Math.abs(maxDrawdown)).toFixed(2) : "N/A", desc: "Annual return / Max DD", good: true },
            { label: "Largest Win", value: `+$${Math.max(0, ...closed.map(t => t.profit ?? 0)).toFixed(2)}`, desc: "Single best trade", good: true },
            { label: "Largest Loss", value: `$${Math.min(0, ...closed.map(t => t.profit ?? 0)).toFixed(2)}`, desc: "Single worst trade", good: false },
          ].map((m, i) => (
            <div key={i} className="p-5">
              <p className={cn("text-lg font-bold font-mono", m.good ? "text-success" : "text-destructive")}>{m.value}</p>
              <p className="text-xs font-semibold mt-1">{m.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
