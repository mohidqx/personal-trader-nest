import { useEffect, useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Star, StarOff, TrendingUp, TrendingDown,
  X, Plus, ChevronRight, Wifi, WifiOff, BarChart2,
  LineChart, CandlestickChart, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Symbol catalog ---
const SYMBOL_CATALOG = [
  { symbol: "FOREXCOM:EURUSD",  label: "EUR/USD",  cat: "Forex",   price: 1.0842,  pip: 0.0001 },
  { symbol: "FOREXCOM:GBPUSD",  label: "GBP/USD",  cat: "Forex",   price: 1.2651,  pip: 0.0001 },
  { symbol: "FOREXCOM:USDJPY",  label: "USD/JPY",  cat: "Forex",   price: 149.32,  pip: 0.01   },
  { symbol: "FOREXCOM:AUDUSD",  label: "AUD/USD",  cat: "Forex",   price: 0.6542,  pip: 0.0001 },
  { symbol: "FOREXCOM:USDCAD",  label: "USD/CAD",  cat: "Forex",   price: 1.3512,  pip: 0.0001 },
  { symbol: "FOREXCOM:USDCHF",  label: "USD/CHF",  cat: "Forex",   price: 0.8921,  pip: 0.0001 },
  { symbol: "FOREXCOM:NZDUSD",  label: "NZD/USD",  cat: "Forex",   price: 0.6123,  pip: 0.0001 },
  { symbol: "FOREXCOM:EURGBP",  label: "EUR/GBP",  cat: "Forex",   price: 0.8565,  pip: 0.0001 },
  { symbol: "BITSTAMP:BTCUSD",  label: "BTC/USD",  cat: "Crypto",  price: 67420,   pip: 1      },
  { symbol: "BITSTAMP:ETHUSD",  label: "ETH/USD",  cat: "Crypto",  price: 3512,    pip: 0.01   },
  { symbol: "BITSTAMP:SOLUSD",  label: "SOL/USD",  cat: "Crypto",  price: 172.4,   pip: 0.01   },
  { symbol: "BITSTAMP:XRPUSD",  label: "XRP/USD",  cat: "Crypto",  price: 0.5521,  pip: 0.0001 },
  { symbol: "OANDA:XAUUSD",     label: "XAU/USD",  cat: "Metals",  price: 2318.0,  pip: 0.01   },
  { symbol: "OANDA:XAGUSD",     label: "XAG/USD",  cat: "Metals",  price: 27.42,   pip: 0.001  },
  { symbol: "NASDAQ:NDX",       label: "NASDAQ",   cat: "Indices", price: 17542,   pip: 0.01   },
  { symbol: "FOREXCOM:SPX500",  label: "S&P 500",  cat: "Indices", price: 5218,    pip: 0.01   },
  { symbol: "FOREXCOM:DE30",    label: "DAX 30",   cat: "Indices", price: 18210,   pip: 0.01   },
  { symbol: "NYMEX:CL1!",       label: "WTI Oil",  cat: "Commodities", price: 79.21, pip: 0.01 },
  { symbol: "COMEX:NG1!",       label: "Nat Gas",  cat: "Commodities", price: 2.14,  pip: 0.001 },
];

const TIMEFRAMES = [
  { label: "1m",  value: "1"   },
  { label: "5m",  value: "5"   },
  { label: "15m", value: "15"  },
  { label: "1H",  value: "60"  },
  { label: "4H",  value: "240" },
  { label: "1D",  value: "D"   },
  { label: "1W",  value: "W"   },
];

const STYLES = [
  { label: "Candles",  value: "1", icon: CandlestickChart },
  { label: "Bars",     value: "0", icon: BarChart2        },
  { label: "Line",     value: "2", icon: LineChart        },
];

const CATS = ["All", "Forex", "Crypto", "Metals", "Indices", "Commodities"];

// --- Live price simulation ---
function useLivePrices(symbols: typeof SYMBOL_CATALOG) {
  const [prices, setPrices] = useState<Record<string, { price: number; change: number; pct: number; up: boolean }>>(() => {
    const init: Record<string, any> = {};
    symbols.forEach(s => { init[s.symbol] = { price: s.price, change: 0, pct: 0, up: true }; });
    return init;
  });

  useEffect(() => {
    const tick = () => {
      setPrices(prev => {
        const next = { ...prev };
        symbols.forEach(s => {
          const delta = (Math.random() - 0.498) * s.pip * 3;
          const newPrice = Math.max(0.0001, prev[s.symbol].price + delta);
          const change = newPrice - s.price;
          const pct = (change / s.price) * 100;
          next[s.symbol] = { price: newPrice, change, pct, up: delta >= 0 };
        });
        return next;
      });
    };
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  return prices;
}

// --- TradingView Widget ---
function TradingViewChart({ symbol, interval, style }: { symbol: string; interval: string; style: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    setLoaded(false);
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style,
      locale: "en",
      backgroundColor: "rgba(13, 15, 23, 0)",
      gridColor: "rgba(30, 35, 55, 0.4)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      drawings_access: { type: "all", tools: [{ name: "Regression Trend" }] },
      studies: ["Volume@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });
    script.onload = () => setLoaded(true);
    container.appendChild(script);
    return () => { container.innerHTML = ""; };
  }, [symbol, interval, style]);

  return (
    <div className="w-full h-full relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground animate-pulse">Loading chart...</p>
          </div>
        </div>
      )}
      <div ref={ref} className="tradingview-widget-container w-full h-full">
        <div className="tradingview-widget-container__widget w-full h-full" />
      </div>
    </div>
  );
}

// --- Watchlist item ---
function WatchlistItem({ item, live, active, onSelect, onRemove }: {
  item: typeof SYMBOL_CATALOG[0];
  live: { price: number; change: number; pct: number; up: boolean };
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef(live.price);

  useEffect(() => {
    if (live.price !== prevPrice.current) {
      setFlash(live.price > prevPrice.current ? "up" : "down");
      prevPrice.current = live.price;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [live.price]);

  const dec = item.pip < 0.001 ? 5 : item.pip < 0.01 ? 4 : item.pip < 0.1 ? 2 : item.pip < 1 ? 2 : 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
        active ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/40",
        flash === "up" && "bg-success/10",
        flash === "down" && "bg-destructive/10"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-mono font-bold truncate">{item.label}</p>
          <span className="text-[9px] text-muted-foreground/60 bg-muted/40 px-1 rounded">{item.cat}</span>
        </div>
        <p className={cn(
          "text-[11px] font-mono mt-0.5 transition-colors duration-300",
          flash === "up" ? "text-success" : flash === "down" ? "text-destructive" : "text-muted-foreground"
        )}>
          {live.price.toFixed(dec)}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="text-right">
          <p className={cn("text-[10px] font-medium font-mono", live.up ? "text-success" : "text-destructive")}>
            {live.up ? "+" : ""}{live.pct.toFixed(2)}%
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-destructive/20 flex items-center justify-center transition-all"
        >
          <X className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export default function ChartPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOL_CATALOG[0]);
  const [interval, setInterval] = useState("D");
  const [chartStyle, setChartStyle] = useState("1");
  const [watchlist, setWatchlist] = useState<typeof SYMBOL_CATALOG>(SYMBOL_CATALOG.slice(0, 8));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCat, setSearchCat] = useState("All");
  const [showSearch, setShowSearch] = useState(false);
  const livePrices = useLivePrices(SYMBOL_CATALOG);
  const searchRef = useRef<HTMLDivElement>(null);

  const currentLive = livePrices[selectedSymbol.symbol];
  const dec = selectedSymbol.pip < 0.001 ? 5 : selectedSymbol.pip < 0.01 ? 4 : selectedSymbol.pip < 0.1 ? 2 : selectedSymbol.pip < 1 ? 2 : 0;

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSearch = SYMBOL_CATALOG.filter(s =>
    (searchCat === "All" || s.cat === searchCat) &&
    (s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToWatchlist = (item: typeof SYMBOL_CATALOG[0]) => {
    if (!watchlist.find(w => w.symbol === item.symbol)) {
      setWatchlist(prev => [...prev, item]);
    }
    setSelectedSymbol(item);
    setShowSearch(false);
    setSearchQuery("");
  };

  const removeFromWatchlist = (sym: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
    if (selectedSymbol.symbol === sym && watchlist.length > 1) {
      setSelectedSymbol(watchlist.find(w => w.symbol !== sym)!);
    }
  };

  return (
    <AppLayout title="Charts" subtitle="Professional TradingView charting with live data">
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Main chart area */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Chart toolbar */}
          <div className="card-glass rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
            {/* Symbol selector */}
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-2 bg-muted/40 hover:bg-muted/70 rounded-xl px-3 py-1.5 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-mono font-bold leading-none">{selectedSymbol.label}</span>
                  <span className="text-[9px] text-muted-foreground">{selectedSymbol.cat}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
              </button>

              {showSearch && (
                <div className="absolute top-full left-0 mt-2 w-72 card-glass rounded-xl border border-border/80 shadow-elevation z-50 overflow-hidden animate-scale-in">
                  <div className="p-2 border-b border-border/40">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search symbols..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs bg-muted/40 border-0"
                      />
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {CATS.map(c => (
                        <button
                          key={c}
                          onClick={() => setSearchCat(c)}
                          className={cn("text-[10px] px-2 py-0.5 rounded-full transition-colors", searchCat === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {filteredSearch.map(s => (
                      <div
                        key={s.symbol}
                        onClick={() => addToWatchlist(s)}
                        className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-xs font-mono font-semibold">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground">{s.cat}</p>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">{s.price.toFixed(dec)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live price badge */}
            {currentLive && (
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-bold">{currentLive.price.toFixed(dec)}</span>
                <span className={cn("flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-lg",
                  currentLive.up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}>
                  {currentLive.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {currentLive.up ? "+" : ""}{currentLive.pct.toFixed(3)}%
                </span>
              </div>
            )}

            <div className="h-4 w-px bg-border/60 mx-1" />

            {/* Timeframes */}
            <div className="flex gap-0.5">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setInterval(tf.value)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                    interval === tf.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-border/60 mx-1" />

            {/* Chart styles */}
            <div className="flex gap-0.5">
              {STYLES.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    onClick={() => setChartStyle(s.value)}
                    title={s.label}
                    className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                      chartStyle === s.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-1.5 text-xs text-success">
              <Wifi className="w-3 h-3" />
              <span className="hidden sm:inline">Live</span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 card-glass rounded-xl overflow-hidden">
            <TradingViewChart symbol={selectedSymbol.symbol} interval={interval} style={chartStyle} />
          </div>
        </div>

        {/* Watchlist Panel */}
        <div className="w-64 flex-shrink-0 card-glass rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold">Watchlist</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5">{watchlist.length}</Badge>
          </div>

          {/* Add symbol */}
          <div className="px-3 pt-3 pb-2 border-b border-border/30 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary bg-muted/30 hover:bg-primary/10 rounded-xl px-3 py-2 transition-all border border-transparent hover:border-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Add symbol
            </button>
          </div>

          {/* Watchlist items */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {watchlist.length === 0 ? (
              <div className="py-8 text-center">
                <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No symbols added</p>
              </div>
            ) : (
              watchlist.map(item => (
                <WatchlistItem
                  key={item.symbol}
                  item={item}
                  live={livePrices[item.symbol]}
                  active={selectedSymbol.symbol === item.symbol}
                  onSelect={() => setSelectedSymbol(item)}
                  onRemove={() => removeFromWatchlist(item.symbol)}
                />
              ))
            )}
          </div>

          {/* Market summary footer */}
          <div className="border-t border-border/40 px-3 py-3 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Market Movers</p>
            {SYMBOL_CATALOG.slice(0, 3)
              .map(s => ({ ...s, live: livePrices[s.symbol] }))
              .sort((a, b) => Math.abs(b.live?.pct || 0) - Math.abs(a.live?.pct || 0))
              .slice(0, 3)
              .map(s => (
                <div key={s.symbol} className="flex items-center justify-between py-1">
                  <span className="text-[11px] font-mono text-muted-foreground">{s.label}</span>
                  <span className={cn("text-[11px] font-mono font-medium", s.live?.up ? "text-success" : "text-destructive")}>
                    {s.live?.up ? "+" : ""}{s.live?.pct.toFixed(2)}%
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
