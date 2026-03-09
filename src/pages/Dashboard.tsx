import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, DollarSign, Activity,
  BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw,
  Eye, Zap, Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";

// TradingView Widget Component
function TradingViewWidget({ symbol = "FOREXCOM:EURUSD" }: { symbol?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(17, 19, 27, 0)",
      gridColor: "rgba(30, 35, 55, 0.5)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    script.onload = () => setLoaded(true);
    container.appendChild(script);
    return () => { container.innerHTML = ""; };
  }, [symbol]);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/50">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="tradingview-widget-container w-full h-full">
        <div className="tradingview-widget-container__widget w-full h-full" />
      </div>
    </div>
  );
}

// Market Ticker
const TICKERS = [
  { symbol: "EUR/USD", price: "1.0842", change: "+0.12%", up: true },
  { symbol: "GBP/USD", price: "1.2651", change: "-0.08%", up: false },
  { symbol: "USD/JPY", price: "149.32", change: "+0.21%", up: true },
  { symbol: "USD/CAD", price: "1.3512", change: "+0.05%", up: true },
  { symbol: "AUD/USD", price: "0.6542", change: "-0.14%", up: false },
  { symbol: "BTC/USD", price: "67,420", change: "+1.84%", up: true },
  { symbol: "ETH/USD", price: "3,512", change: "+0.97%", up: true },
  { symbol: "XAU/USD", price: "2,318", change: "+0.43%", up: true },
  { symbol: "NASDAQ", price: "17,542", change: "+0.38%", up: true },
  { symbol: "S&P 500", price: "5,218", change: "-0.11%", up: false },
];

// Generate portfolio chart data
const generatePortfolioData = (balance: number) => {
  const data = [];
  let val = balance * 0.7;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    val += (Math.random() - 0.38) * (balance * 0.04);
    val = Math.max(val, balance * 0.5);
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(val * 100) / 100,
    });
  }
  data[data.length - 1].value = balance;
  return data;
};

const CHART_SYMBOLS = [
  { label: "EUR/USD", value: "FOREXCOM:EURUSD" },
  { label: "GBP/USD", value: "FOREXCOM:GBPUSD" },
  { label: "USD/JPY", value: "FOREXCOM:USDJPY" },
  { label: "BTC/USD", value: "BITSTAMP:BTCUSD" },
  { label: "ETH/USD", value: "BITSTAMP:ETHUSD" },
  { label: "NASDAQ", value: "NASDAQ:NDX" },
  { label: "XAU/USD", value: "OANDA:XAUUSD" },
];

export default function Dashboard() {
  const { toast } = useToast();
  const [username, setUsername] = useState("Trader");
  const [balance, setBalance] = useState(0);
  const [todayPnL, setTodayPnL] = useState(0);
  const [openPositions, setOpenPositions] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(CHART_SYMBOLS[0]);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await loadData(session.user.id);
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async (userId: string) => {
    const [profileRes, walletRes, tradesRes] = await Promise.all([
      supabase.from("profiles").select("username, full_name").eq("user_id", userId).single(),
      supabase.from("wallets").select("balance").eq("user_id", userId).single(),
      supabase.from("trades").select("*").eq("user_id", userId).order("opened_at", { ascending: false }).limit(50),
    ]);

    if (profileRes.data) setUsername(profileRes.data.username || "Trader");
    const bal = Number(walletRes.data?.balance || 0);
    setBalance(bal);
    setPortfolioData(generatePortfolioData(bal || 10000));

    if (tradesRes.data) {
      setTrades(tradesRes.data.slice(0, 8));
      const openCount = tradesRes.data.filter((t) => t.status === "open").length;
      setOpenPositions(openCount);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const pnl = tradesRes.data
        .filter((t) => t.closed_at && new Date(t.closed_at) >= today)
        .reduce((s, t) => s + Number(t.profit || 0), 0);
      setTodayPnL(pnl);
      const closed = tradesRes.data.filter((t) => t.status === "closed");
      if (closed.length > 0) {
        const wins = closed.filter((t) => Number(t.profit) > 0).length;
        setWinRate((wins / closed.length) * 100);
      }
      const profit = tradesRes.data.reduce((s, t) => s + Number(t.profit || 0), 0);
      setTotalProfit(profit);
    }
  };

  const statCards = [
    {
      label: "Account Balance",
      value: `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "+12.5%",
      up: true,
      icon: DollarSign,
      color: "primary",
    },
    {
      label: "Today's P&L",
      value: `${todayPnL >= 0 ? "+" : ""}$${Math.abs(todayPnL).toFixed(2)}`,
      change: todayPnL >= 0 ? "+Today" : "-Today",
      up: todayPnL >= 0,
      icon: Activity,
      color: todayPnL >= 0 ? "success" : "destructive",
    },
    {
      label: "Open Positions",
      value: openPositions.toString(),
      change: "Active now",
      up: true,
      icon: Target,
      color: "primary",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      change: "+5.2%",
      up: true,
      icon: TrendingUp,
      color: "success",
    },
  ];

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome back, @${username}`}>
      {/* Market Ticker */}
      <div className="mb-6 -mx-6 px-0 overflow-hidden border-y border-border/40 bg-card/30">
        <div
          className={`flex gap-0 py-2 ${tickerPaused ? "" : "ticker-scroll"}`}
          style={{ width: "max-content" }}
          onMouseEnter={() => setTickerPaused(true)}
          onMouseLeave={() => setTickerPaused(false)}
        >
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-6 border-r border-border/30 last:border-0 whitespace-nowrap cursor-default hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs font-semibold text-foreground">{t.symbol}</span>
              <span className="text-xs font-mono text-foreground">{t.price}</span>
              <span className={`text-[11px] font-medium flex items-center gap-0.5 ${t.up ? "text-success" : "text-destructive"}`}>
                {t.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {t.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="card-glass rounded-xl p-5 hover:border-primary/30 transition-all duration-200 animate-fade-in group"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  card.color === "primary" ? "bg-primary/15 text-primary" :
                  card.color === "success" ? "bg-success/15 text-success" :
                  "bg-destructive/15 text-destructive"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${
                  card.up ? "text-success" : "text-destructive"
                }`}>
                  {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.change}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className={`text-2xl font-bold font-mono tracking-tight ${
                card.color === "success" && !card.label.includes("Balance") ? "text-success" :
                card.color === "destructive" ? "text-destructive" :
                "text-foreground"
              }`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: TradingView + Portfolio Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* TradingView Chart */}
        <div className="xl:col-span-2 card-glass rounded-xl overflow-hidden" style={{ height: "480px" }}>
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Live Chart</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {CHART_SYMBOLS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedSymbol(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedSymbol.value === s.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: "calc(100% - 57px)" }}>
            <TradingViewWidget symbol={selectedSymbol.value} />
          </div>
        </div>

        {/* Portfolio Value Chart */}
        <div className="card-glass rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-2xl font-bold font-mono mt-1">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(2)}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(189 100% 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(189 100% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 24% 12%)",
                    border: "1px solid hsl(222 18% 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(189 100% 48%)"
                  strokeWidth={2}
                  fill="url(#portfolioGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/40">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">30D High</p>
              <p className="text-sm font-mono font-semibold text-success mt-0.5">
                ${portfolioData.length ? Math.max(...portfolioData.map((d) => d.value)).toFixed(2) : "0.00"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">30D Low</p>
              <p className="text-sm font-mono font-semibold text-destructive mt-0.5">
                ${portfolioData.length ? Math.min(...portfolioData.map((d) => d.value)).toFixed(2) : "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades + Quick Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <div className="xl:col-span-2 card-glass rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Recent Trades</span>
            </div>
            <Badge variant="secondary" className="text-xs">{trades.length} shown</Badge>
          </div>

          <div className="divide-y divide-border/30">
            {trades.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No trades yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Connect your MT5 account to see trades</p>
              </div>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      trade.type === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {trade.type === "buy" ? "B" : "S"}
                    </div>
                    <div>
                      <p className="text-sm font-mono font-semibold">{trade.symbol}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {trade.volume} lots · @ {trade.open_price}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      trade.status === "open"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {trade.status}
                    </span>
                    <span className={`font-mono font-semibold text-sm ${
                      Number(trade.profit) >= 0 ? "text-success" : "text-destructive"
                    }`}>
                      {Number(trade.profit) >= 0 ? "+" : ""}${Number(trade.profit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-4">
          {/* Performance Ring */}
          <div className="card-glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Performance</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(222 18% 18%)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="none"
                    stroke="hsl(189 100% 48%)"
                    strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 26 * winRate / 100} ${2 * Math.PI * 26 * (1 - winRate / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold font-mono">{winRate.toFixed(0)}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Win Rate</p>
                <p className="text-xs text-muted-foreground">{trades.filter(t => t.status === "closed").length} closed trades</p>
              </div>
            </div>
          </div>

          {/* Market Summary */}
          <div className="card-glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Top Movers</p>
            <div className="space-y-2.5">
              {TICKERS.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{t.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{t.price}</span>
                    <span className={`text-[11px] font-medium ${t.up ? "text-success" : "text-destructive"}`}>
                      {t.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Deposit", icon: "💰", href: "/wallet" },
                { label: "Withdraw", icon: "💸", href: "/wallet" },
                { label: "Copy Trade", icon: "📋", href: "/copy-trading" },
                { label: "Accounts", icon: "🔗", href: "/mt5-accounts" },
              ].map((action, i) => (
                <a
                  key={i}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all text-center"
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
