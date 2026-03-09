import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Medal, TrendingUp, Users, Target, BarChart3,
  Crown, Star, Zap, ArrowUp, ArrowDown, Minus, RefreshCw,
  Award, Flame, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell
} from "recharts";

interface LeaderEntry {
  user_id: string;
  full_name: string | null;
  username: string;
  total_profit: number;
  win_rate: number;
  total_trades: number;
  followers_count: number;
  rank?: number;
  prevRank?: number;
}

// Generate mock leaderboard if no real data
function generateMockLeaders(): LeaderEntry[] {
  const names = [
    "Alex Morgan", "Sarah Chen", "James Wilson", "Priya Patel",
    "Marcus Johnson", "Elena Vasquez", "David Kim", "Natasha Brown",
    "Carlos Rivera", "Amelia Foster",
  ];
  return names.map((name, i) => ({
    user_id: `mock-${i}`,
    full_name: name,
    username: name.toLowerCase().replace(" ", "_"),
    total_profit: Math.round((10000 - i * 850 + Math.random() * 400) * 100) / 100,
    win_rate: Math.round((78 - i * 3 + Math.random() * 5) * 10) / 10,
    total_trades: Math.round(400 - i * 32 + Math.random() * 50),
    followers_count: Math.round(320 - i * 28 + Math.random() * 40),
    rank: i + 1,
    prevRank: i + 1 + (Math.random() > 0.5 ? 1 : -1) * Math.ceil(Math.random() * 2),
  }));
}

const TIERS = [
  { min: 1,  max: 1,  label: "Champion",  color: "text-yellow-400",  bg: "bg-yellow-500/15",  border: "border-yellow-500/30",  icon: Crown  },
  { min: 2,  max: 3,  label: "Elite",     color: "text-slate-300",   bg: "bg-slate-400/10",   border: "border-slate-400/20",   icon: Trophy },
  { min: 4,  max: 10, label: "Pro",       color: "text-primary",     bg: "bg-primary/10",     border: "border-primary/20",     icon: Medal  },
];

function getTier(rank: number) {
  return TIERS.find(t => rank >= t.min && rank <= t.max) || TIERS[2];
}

function RankMovement({ current, prev }: { current: number; prev: number }) {
  const diff = prev - current; // positive = moved up
  if (diff === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (diff > 0) return (
    <span className="flex items-center gap-0.5 text-success text-[10px] font-bold">
      <ArrowUp className="w-3 h-3" />+{diff}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-destructive text-[10px] font-bold">
      <ArrowDown className="w-3 h-3" />{diff}
    </span>
  );
}

function PodiumCard({ trader, rank }: { trader: LeaderEntry; rank: 1 | 2 | 3 }) {
  const heights = { 1: "h-36", 2: "h-24", 3: "h-20" };
  const orders = { 1: "order-2", 2: "order-1", 3: "order-3" };
  const icons = { 1: Crown, 2: Trophy, 3: Medal };
  const colors = {
    1: "from-yellow-500/20 via-yellow-400/10 to-transparent border-yellow-500/30 text-yellow-400",
    2: "from-slate-400/20 via-slate-300/10 to-transparent border-slate-400/20 text-slate-300",
    3: "from-orange-600/20 via-orange-500/10 to-transparent border-orange-600/20 text-orange-400",
  };
  const Icon = icons[rank];

  return (
    <div className={cn("flex flex-col items-center gap-3 animate-fade-in", orders[rank])}>
      {/* Avatar */}
      <div className="relative">
        <div className={cn(
          "w-16 h-16 rounded-2xl bg-gradient-to-br border-2 flex items-center justify-center text-2xl font-bold shadow-lg",
          colors[rank]
        )}>
          {(trader.full_name || trader.username || "?").charAt(0).toUpperCase()}
        </div>
        <div className={cn("absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border",
          rank === 1 ? "bg-yellow-500 border-yellow-400" : rank === 2 ? "bg-slate-400 border-slate-300" : "bg-orange-600 border-orange-500"
        )}>
          <Icon className="w-3 h-3 text-white" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-bold truncate max-w-24">{trader.full_name || trader.username}</p>
        <p className={cn("text-base font-mono font-bold", rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-300" : "text-orange-400")}>
          +${trader.total_profit.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">{trader.win_rate}% WR</p>
      </div>

      {/* Podium bar */}
      <div className={cn(
        "w-24 rounded-t-xl flex items-end justify-center pb-2 border-t border-x bg-gradient-to-b",
        colors[rank], heights[rank]
      )}>
        <span className="text-2xl font-black opacity-30">#{rank}</span>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { label: "Total P&L", value: "total_profit" },
  { label: "Win Rate", value: "win_rate" },
  { label: "Trades", value: "total_trades" },
  { label: "Followers", value: "followers_count" },
];

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [sortBy, setSortBy] = useState("total_profit");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prevRanks = useRef<Record<string, number>>({});

  const loadLeaders = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);

    // Try to load from master_trader_stats joined with profiles
    const { data } = await supabase
      .from("master_trader_stats")
      .select("*, profiles!master_trader_stats_user_id_fkey(full_name, username)")
      .eq("is_accepting_followers", true)
      .order(sortBy, { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const ranked = data.map((d, i) => ({
        user_id: d.user_id,
        full_name: (d as any).profiles?.full_name,
        username: (d as any).profiles?.username || "trader",
        total_profit: d.total_profit ?? 0,
        win_rate: d.win_rate ?? 0,
        total_trades: d.total_trades ?? 0,
        followers_count: d.followers_count ?? 0,
        rank: i + 1,
        prevRank: prevRanks.current[d.user_id] || i + 1,
      }));
      ranked.forEach(r => { prevRanks.current[r.user_id] = r.rank; });
      setLeaders(ranked);
    } else {
      // Use mock data if no real traders
      setLeaders(generateMockLeaders());
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadLeaders(); }, [sortBy]);

  const sorted = [...leaders].sort((a, b) => Number(b[sortBy as keyof LeaderEntry]) - Number(a[sortBy as keyof LeaderEntry]));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Bar chart top 10 P&L
  const barData = sorted.slice(0, 10).map(l => ({
    name: (l.full_name || l.username || "?").split(" ")[0],
    profit: l.total_profit,
  }));

  if (loading) return (
    <AppLayout title="Leaderboard">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Leaderboard" subtitle="Top performing traders on the platform">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-xl font-medium transition-all",
                sortBy === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => loadLeaders(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="card-glass rounded-2xl p-8 mb-6 overflow-hidden relative">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="text-center mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Hall of Champions</p>
            <p className="text-lg font-bold mt-1">Top 3 Traders</p>
          </div>
          <div className="flex justify-center items-end gap-4">
            <PodiumCard trader={top3[1]} rank={2} />
            <PodiumCard trader={top3[0]} rank={1} />
            <PodiumCard trader={top3[2]} rank={3} />
          </div>
        </div>
      )}

      {/* Stats + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Traders", value: leaders.length, icon: Users, color: "primary" },
          { label: "Combined P&L", value: `$${leaders.reduce((s, l) => s + l.total_profit, 0).toLocaleString()}`, icon: TrendingUp, color: "success" },
          { label: "Avg Win Rate", value: `${leaders.length ? (leaders.reduce((s, l) => s + l.win_rate, 0) / leaders.length).toFixed(1) : 0}%`, icon: Target, color: "primary" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-glass rounded-xl p-4 flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                stat.color === "success" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* P&L bar chart */}
      {barData.length > 0 && (
        <div className="card-glass rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Top 10 Trader Profits</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip
                  contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number) => [`+$${v.toLocaleString()}`, "Profit"]}
                />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "hsl(45 93% 58%)" : i === 1 ? "hsl(215 20% 65%)" : i === 2 ? "hsl(24 75% 50%)" : "hsl(189 100% 48%)"}
                      opacity={1 - i * 0.05}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Full leaderboard table */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
          <Award className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Full Rankings</h2>
          <Badge variant="secondary" className="ml-auto">{sorted.length} traders</Badge>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[48px_1fr_100px_100px_80px_80px] px-5 py-2.5 bg-muted/20 border-b border-border/30">
          {["Rank", "Trader", "Profit", "Win Rate", "Trades", "Followers"].map((h, i) => (
            <p key={i} className={cn("text-[10px] uppercase tracking-wider font-semibold text-muted-foreground", i > 0 && "text-right")}>{h}</p>
          ))}
        </div>

        <div className="divide-y divide-border/20">
          {sorted.map((trader, idx) => {
            const tier = getTier(trader.rank || idx + 1);
            const TierIcon = tier.icon;
            return (
              <div
                key={trader.user_id}
                className="grid grid-cols-[48px_1fr_100px_100px_80px_80px] items-center px-5 py-3.5 hover:bg-muted/20 transition-colors animate-fade-in group"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Rank */}
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-sm font-bold font-mono w-6", tier.color)}>
                    #{trader.rank || idx + 1}
                  </span>
                  <RankMovement current={trader.rank || idx + 1} prev={trader.prevRank || idx + 1} />
                </div>

                {/* Trader info */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl bg-gradient-to-br border flex items-center justify-center font-bold text-sm flex-shrink-0",
                    tier.bg, tier.border, tier.color
                  )}>
                    {(trader.full_name || trader.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{trader.full_name || "Anonymous"}</p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", tier.bg, tier.border, tier.color)}>
                        {tier.label}
                      </span>
                      {(trader.rank || idx + 1) <= 3 && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                    </div>
                    <p className="text-xs text-muted-foreground">@{trader.username}</p>
                  </div>
                </div>

                {/* Profit */}
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-success">+${trader.total_profit.toLocaleString()}</p>
                </div>

                {/* Win Rate */}
                <div className="text-right">
                  <p className={cn("text-sm font-mono font-semibold",
                    trader.win_rate >= 65 ? "text-success" : trader.win_rate >= 50 ? "text-warning" : "text-destructive"
                  )}>
                    {trader.win_rate.toFixed(1)}%
                  </p>
                </div>

                {/* Trades */}
                <div className="text-right">
                  <p className="text-xs font-mono text-foreground">{trader.total_trades}</p>
                </div>

                {/* Followers */}
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">{trader.followers_count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
