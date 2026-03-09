import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, Search, RefreshCw,
  BarChart3, Activity, Target, DollarSign,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Layers, Zap, CheckCircle2, XCircle, Wifi, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, ReferenceLine, BarChart, Bar, Cell
} from "recharts";

interface Trade {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number | null;
  profit: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  mt5_account_id: string | null;
}

// Simulated pip values per symbol
const PIP_MAP: Record<string, number> = {
  "EUR/USD": 0.0001, "GBP/USD": 0.0001, "USD/JPY": 0.01,
  "AUD/USD": 0.0001, "USD/CAD": 0.0001, "USD/CHF": 0.0001,
  "BTC/USD": 1, "ETH/USD": 0.01, "XAU/USD": 0.01,
  DEFAULT: 0.0001,
};

// Live P&L simulation for open trades
function useLivePnL(openTrades: Trade[]) {
  const [livePnL, setLivePnL] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    openTrades.forEach(t => { init[t.id] = t.profit ?? 0; });
    return init;
  });
  const pricesRef = useRef<Record<string, number>>({});

  // Seed initial prices
  useEffect(() => {
    openTrades.forEach(t => {
      if (!pricesRef.current[t.id]) pricesRef.current[t.id] = t.open_price;
    });
  }, [openTrades.length]);

  useEffect(() => {
    if (openTrades.length === 0) return;
    const tick = () => {
      setLivePnL(prev => {
        const next = { ...prev };
        openTrades.forEach(t => {
          const pip = PIP_MAP[t.symbol] ?? PIP_MAP.DEFAULT;
          const delta = (Math.random() - 0.495) * pip * 4;
          pricesRef.current[t.id] = (pricesRef.current[t.id] ?? t.open_price) + delta;
          const currentPrice = pricesRef.current[t.id];
          const priceDiff = t.type === "buy"
            ? currentPrice - t.open_price
            : t.open_price - currentPrice;
          // Approximate: 1 pip = $10 for standard lot, scale by volume
          const lotMultiplier = (1 / pip) * 0.001 * t.volume;
          next[t.id] = Math.round(priceDiff * lotMultiplier * 1000) / 10;
        });
        return next;
      });
    };
    const id = setInterval(tick, 5000);
    tick(); // immediate first tick
    return () => clearInterval(id);
  }, [openTrades]);

  return livePnL;
}

// Live P&L ticker banner for open positions
function LivePnLTicker({ openTrades, livePnL }: { openTrades: Trade[]; livePnL: Record<string, number> }) {
  const totalLive = Object.values(livePnL).reduce((s, v) => s + v, 0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(t);
  }, [Math.round(totalLive)]);

  if (openTrades.length === 0) return null;

  return (
    <div className={cn(
      "card-glass rounded-xl mb-5 border overflow-hidden transition-all duration-300",
      totalLive >= 0 ? "border-success/25" : "border-destructive/25"
    )}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-success animate-pulse" />
          <span className="text-xs font-semibold">Live Open Positions</span>
          <Badge variant="outline" className="text-[10px] border-success/30 text-success">{openTrades.length} active</Badge>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Total Float:</span>
          <span className={cn(
            "text-sm font-bold font-mono transition-all duration-300",
            pulse && "scale-110",
            totalLive >= 0 ? "text-success" : "text-destructive"
          )}>
            {totalLive >= 0 ? "+" : ""}${totalLive.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex gap-0 overflow-x-auto scrollbar-none">
        {openTrades.map(t => {
          const pnl = livePnL[t.id] ?? 0;
          const isPos = pnl >= 0;
          return (
            <div key={t.id} className={cn(
              "flex-shrink-0 px-4 py-3 border-r border-border/30 last:border-0 min-w-36",
              isPos ? "bg-success/5" : "bg-destructive/5"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                  t.type === "buy" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                )}>
                  {t.type.toUpperCase()}
                </span>
                <span className="text-xs font-mono font-semibold">{t.symbol}</span>
              </div>
              <p className={cn("text-sm font-bold font-mono transition-colors duration-300", isPos ? "text-success" : "text-destructive")}>
                {isPos ? "+" : ""}${pnl.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">{t.volume} lots · {new Date(t.opened_at).toLocaleTimeString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TradePnLSparkline({ trade }: { trade: Trade }) {
  const data = useMemo(() => {
    const steps = 20;
    const result = [];
    const end = trade.close_price ?? trade.open_price * (trade.type === "buy" ? 1.0012 : 0.9988);
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const noise = (Math.random() - 0.5) * (trade.open_price * 0.0008);
      const price = trade.open_price + (end - trade.open_price) * progress + noise;
      const pnl = trade.type === "buy" ? (price - trade.open_price) * 1000 : (trade.open_price - price) * 1000;
      result.push({ i, pnl: Math.round(pnl * 100) / 100 });
    }
    return result;
  }, [trade.id]);
  const isProfit = (trade.profit ?? 0) >= 0;
  const color = isProfit ? "hsl(142 76% 45%)" : "hsl(0 84% 60%)";

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${trade.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={0} stroke="hsl(222 18% 25%)" strokeDasharray="2 2" />
        <Area
          type="monotone"
          dataKey="pnl"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${trade.id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TradeRow({ trade, expanded, onToggle }: { trade: Trade; expanded: boolean; onToggle: () => void }) {
  const isProfit = (trade.profit ?? 0) >= 0;
  const duration = trade.closed_at
    ? (() => {
        const ms = new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : (() => {
        const ms = Date.now() - new Date(trade.opened_at).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })();

  const pips = trade.close_price
    ? Math.abs((trade.close_price - trade.open_price) * (trade.symbol.includes("JPY") ? 100 : 10000)).toFixed(1)
    : "—";

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[1fr_80px_80px_100px_100px_80px_80px_40px] items-center px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer border-b border-border/30",
          expanded && "bg-primary/5 border-primary/20"
        )}
        onClick={onToggle}
      >
        {/* Symbol + Type */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
            trade.type === "buy" ? "bg-success/15 text-success border border-success/20" : "bg-destructive/15 text-destructive border border-destructive/20"
          )}>
            {trade.type === "buy" ? "B" : "S"}
          </div>
          <div>
            <p className="text-sm font-mono font-bold">{trade.symbol}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{trade.type} · {trade.volume} lots</p>
          </div>
        </div>

        {/* Open Price */}
        <div className="text-right">
          <p className="text-xs font-mono text-foreground">{trade.open_price}</p>
          <p className="text-[10px] text-muted-foreground">Open</p>
        </div>

        {/* Close Price */}
        <div className="text-right">
          <p className="text-xs font-mono text-foreground">{trade.close_price ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">Close</p>
        </div>

        {/* Sparkline */}
        <div className="px-1">
          <TradePnLSparkline trade={trade} />
        </div>

        {/* P&L */}
        <div className="text-right">
          <p className={cn("text-sm font-mono font-bold", isProfit ? "text-success" : "text-destructive")}>
            {(trade.profit ?? 0) >= 0 ? "+" : ""}${(trade.profit ?? 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">{pips} pips</p>
        </div>

        {/* Duration */}
        <div className="text-right">
          <p className="text-xs text-foreground font-mono">{duration}</p>
          <p className="text-[10px] text-muted-foreground">Duration</p>
        </div>

        {/* Status */}
        <div className="flex justify-end">
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-medium border",
            trade.status === "open"
              ? "bg-primary/10 text-primary border-primary/20"
              : isProfit
              ? "bg-success/10 text-success border-success/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}>
            {trade.status}
          </span>
        </div>

        {/* Expand */}
        <div className="flex justify-center text-muted-foreground">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="bg-muted/10 border-b border-border/30 px-4 py-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-4">
            {[
              { label: "Trade ID", value: trade.id.slice(0, 8) + "..." },
              { label: "Opened At", value: new Date(trade.opened_at).toLocaleString() },
              { label: "Closed At", value: trade.closed_at ? new Date(trade.closed_at).toLocaleString() : "Still Open" },
              { label: "Volume (Lots)", value: trade.volume.toString() },
              { label: "Open Price", value: trade.open_price.toString() },
              { label: "Close Price", value: trade.close_price?.toString() ?? "—" },
              { label: "Profit / Loss", value: `${(trade.profit ?? 0) >= 0 ? "+" : ""}$${(trade.profit ?? 0).toFixed(2)}`, highlight: isProfit ? "success" : "destructive" },
              { label: "Pips", value: pips },
              { label: "Duration", value: duration },
              { label: "Return %", value: trade.open_price ? `${(((trade.profit ?? 0) / (trade.open_price * trade.volume * 100)) * 100).toFixed(3)}%` : "—" },
            ].map((item, i) => (
              <div key={i} className="bg-card/60 rounded-lg p-3 border border-border/40">
                <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                <p className={cn(
                  "text-xs font-mono font-semibold",
                  item.highlight === "success" ? "text-success" :
                  item.highlight === "destructive" ? "text-destructive" : "text-foreground"
                )}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function Trades() {
  const [user, setUser] = useState<any>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSymbol, setFilterSymbol] = useState("all");
  const [sortBy, setSortBy] = useState("opened_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadTrades(session.user.id);
      }
    });
  }, []);

  // Live P&L for open trades
  const openTrades = useMemo(() => trades.filter(t => t.status === "open"), [trades]);
  const livePnL = useLivePnL(openTrades);

  const loadTrades = async (userId: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("opened_at", { ascending: false });
    setTrades(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    if (user) loadTrades(user.id, true);
  };

  // Derived stats
  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const open = trades.filter((t) => t.status === "open");
    const totalPnL = closed.reduce((s, t) => s + (t.profit ?? 0), 0);
    const wins = closed.filter((t) => (t.profit ?? 0) > 0);
    const losses = closed.filter((t) => (t.profit ?? 0) <= 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.profit ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.profit ?? 0), 0) / losses.length : 0;
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0;
    return { totalPnL, totalTrades: trades.length, openTrades: open.length, closedTrades: closed.length, winRate, avgWin, avgLoss, profitFactor };
  }, [trades]);

  // Monthly P&L chart
  const monthlyPnL = useMemo(() => {
    const map: Record<string, number> = {};
    trades.filter((t) => t.status === "closed").forEach((t) => {
      const key = new Date(t.closed_at!).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + (t.profit ?? 0);
    });
    return Object.entries(map).map(([month, pnl]) => ({ month, pnl: Math.round(pnl * 100) / 100 })).slice(-8);
  }, [trades]);

  // Unique symbols for filter
  const symbols = useMemo(() => Array.from(new Set(trades.map((t) => t.symbol))).sort(), [trades]);

  // Filtered + sorted trades
  const filtered = useMemo(() => {
    let result = [...trades];
    if (search) result = result.filter((t) => t.symbol.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus !== "all") result = result.filter((t) => t.status === filterStatus);
    if (filterType !== "all") result = result.filter((t) => t.type === filterType);
    if (filterSymbol !== "all") result = result.filter((t) => t.symbol === filterSymbol);
    result.sort((a, b) => {
      let av: any, bv: any;
      if (sortBy === "opened_at") { av = new Date(a.opened_at).getTime(); bv = new Date(b.opened_at).getTime(); }
      else if (sortBy === "profit") { av = a.profit ?? 0; bv = b.profit ?? 0; }
      else if (sortBy === "volume") { av = a.volume; bv = b.volume; }
      else if (sortBy === "symbol") { av = a.symbol; bv = b.symbol; }
      else { av = a[sortBy as keyof Trade] ?? 0; bv = b[sortBy as keyof Trade] ?? 0; }
      return sortDir === "desc" ? (av > bv ? -1 : 1) : (av < bv ? -1 : 1);
    });
    return result;
  }, [trades, search, filterStatus, filterType, filterSymbol, sortBy, sortDir]);

  if (loading) return (
    <AppLayout title="Trades">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Trades" subtitle="Full trade history with analytics & P&L breakdown">
      {/* Live P&L Ticker for open positions */}
      <LivePnLTicker openTrades={openTrades} livePnL={livePnL} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {[
          { label: "Total Trades", value: stats.totalTrades, icon: Layers, color: "primary" },
          { label: "Open", value: stats.openTrades, icon: Zap, color: "primary" },
          { label: "Closed", value: stats.closedTrades, icon: CheckCircle2, color: "muted" },
          { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: stats.winRate >= 50 ? "success" : "destructive" },
          { label: "Total P&L", value: `${stats.totalPnL >= 0 ? "+" : ""}$${stats.totalPnL.toFixed(2)}`, icon: DollarSign, color: stats.totalPnL >= 0 ? "success" : "destructive" },
          { label: "Avg Win", value: `+$${stats.avgWin.toFixed(2)}`, icon: ArrowUpRight, color: "success" },
          { label: "Avg Loss", value: `$${stats.avgLoss.toFixed(2)}`, icon: ArrowDownRight, color: "destructive" },
          { label: "Profit Factor", value: stats.profitFactor.toFixed(2), icon: BarChart3, color: stats.profitFactor >= 1.5 ? "success" : "primary" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-glass rounded-xl p-3 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-2",
                s.color === "primary" ? "bg-primary/15 text-primary" :
                s.color === "success" ? "bg-success/15 text-success" :
                s.color === "destructive" ? "bg-destructive/15 text-destructive" :
                "bg-muted/50 text-muted-foreground"
              )}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className={cn("text-sm font-bold font-mono",
                s.color === "success" ? "text-success" :
                s.color === "destructive" ? "text-destructive" : "text-foreground"
              )}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly P&L Chart */}
      {monthlyPnL.length > 0 && (
        <div className="card-glass rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Monthly P&L Performance</h2>
            <Badge variant="secondary" className="ml-auto text-xs">{monthlyPnL.length} months</Badge>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnL} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
                <ReferenceLine y={0} stroke="hsl(222 18% 30%)" />
                <Tooltip
                  contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number) => [`${v >= 0 ? "+" : ""}$${v.toFixed(2)}`, "P&L"]}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyPnL.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "hsl(142 76% 45%)" : "hsl(0 84% 60%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card-glass rounded-xl mb-4">
        <div className="flex items-center gap-3 p-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSymbol} onValueChange={setFilterSymbol}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Symbols</SelectItem>
              {symbols.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="opened_at">Date</SelectItem>
              <SelectItem value="profit">P&L</SelectItem>
              <SelectItem value="volume">Volume</SelectItem>
              <SelectItem value="symbol">Symbol</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
          >
            {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {sortDir === "desc" ? "Newest" : "Oldest"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>
          <Badge variant="outline" className="text-xs ml-auto">
            {filtered.length} / {trades.length} trades
          </Badge>
        </div>
      </div>

      {/* Trade Table */}
      <div className="card-glass rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_80px_80px_100px_100px_80px_80px_40px] px-4 py-2.5 border-b border-border/50 bg-muted/20">
          {["Instrument", "Open", "Close", "Chart", "P&L", "Duration", "Status", ""].map((h, i) => (
            <p key={i} className={cn("text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", i > 0 && "text-right", i === 7 && "text-center")}>{h}</p>
          ))}
        </div>

        {/* Rows */}
        <div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No trades match your filters</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the search or filter criteria</p>
            </div>
          ) : (
            filtered.map((trade) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                expanded={expandedId === trade.id}
                onToggle={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
