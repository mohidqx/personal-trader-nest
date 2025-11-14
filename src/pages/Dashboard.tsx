import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  LogOut, 
  DollarSign, 
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  UserCircle,
  Wallet,
  Link2,
  Shield,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [todayPnL, setTodayPnL] = useState<number>(0);
  const [openPositions, setOpenPositions] = useState<number>(0);
  const [winRate, setWinRate] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    // Load username
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .single();
    
    if (profileData) {
      setUsername((profileData as any).username || "");
    }

    // Load user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (roleData) {
      setUserRole(roleData.role);
    }

    // Load wallet balance
    const { data: walletData } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    if (walletData) {
      setBalance(Number(walletData.balance) || 0);
    }

    // Load trades data
    const { data: tradesData } = await supabase
      .from("trades")
      .select("status, profit, opened_at, closed_at")
      .eq("user_id", userId);

    if (tradesData) {
      // Count open positions
      const openCount = tradesData.filter(t => t.status === 'open').length;
      setOpenPositions(openCount);

      // Calculate today's P&L
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayProfit = tradesData
        .filter(t => t.closed_at && new Date(t.closed_at) >= today)
        .reduce((sum, t) => sum + (Number(t.profit) || 0), 0);
      setTodayPnL(todayProfit);

      // Calculate win rate
      const closedTrades = tradesData.filter(t => t.status === 'closed');
      if (closedTrades.length > 0) {
        const winningTrades = closedTrades.filter(t => Number(t.profit) > 0).length;
        setWinRate((winningTrades / closedTrades.length) * 100);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">TradePro</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/profile")}>
              <UserCircle className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" onClick={() => navigate("/wallet")}>
              <Wallet className="h-4 w-4 mr-2" />
              Wallet
            </Button>
            <Button variant="ghost" onClick={() => navigate("/mt5-accounts")}>
              <Link2 className="h-4 w-4 mr-2" />
              MT5
            </Button>
            <Button variant="ghost" onClick={() => navigate("/copy-trading")}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Trading
            </Button>
            <Button variant="ghost" onClick={() => navigate("/security")}>
              <Shield className="h-4 w-4 mr-2" />
              Security
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-border/50 hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-foreground">
              Welcome Back, {username || "Trader"}
            </h2>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              userRole === 'admin' 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-muted text-muted-foreground border border-border'
            }`}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
          <p className="text-muted-foreground">@{username} • {user?.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-border/50 hover:shadow-glow transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm text-success flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                12.5%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Account Balance</p>
            <p className="text-2xl font-bold font-mono text-foreground">${balance.toFixed(2)}</p>
          </Card>

          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-border/50 hover:shadow-glow transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Activity className="h-6 w-6 text-success" />
              </div>
              <span className="text-sm text-success flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                8.3%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Today's P&L</p>
            <p className={`text-2xl font-bold font-mono ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-border/50 hover:shadow-glow transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm text-destructive flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4" />
                2.1%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Open Positions</p>
            <p className="text-2xl font-bold font-mono text-foreground">{openPositions}</p>
          </Card>

          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-border/50 hover:shadow-glow transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <span className="text-sm text-success flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                15.7%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
            <p className="text-2xl font-bold font-mono text-foreground">{winRate.toFixed(1)}%</p>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="p-6 bg-gradient-card backdrop-blur-xl border-border/50 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">Market Overview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-border/50">1H</Button>
              <Button variant="outline" size="sm" className="border-border/50">4H</Button>
              <Button variant="outline" size="sm" className="border-border/50 bg-primary/10 text-primary">1D</Button>
              <Button variant="outline" size="sm" className="border-border/50">1W</Button>
            </div>
          </div>
          <div className="h-96 rounded-lg bg-secondary/30 flex items-center justify-center border border-border/30">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-primary/50 mx-auto mb-4" />
              <p className="text-muted-foreground">TradingView Chart Integration</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Connect your TradingView account to view live charts</p>
            </div>
          </div>
        </Card>

        {/* Recent Trades */}
        <Card className="p-6 bg-gradient-card backdrop-blur-xl border-border/50">
          <h3 className="text-xl font-bold text-foreground mb-6">Recent Trades</h3>
          <div className="space-y-4">
            {[
              { pair: "EUR/USD", type: "BUY", size: "0.5", entry: "1.0850", pl: "+145.20", status: "success" },
              { pair: "GBP/JPY", type: "SELL", size: "0.3", entry: "185.42", pl: "+89.50", status: "success" },
              { pair: "USD/CAD", type: "BUY", size: "0.7", entry: "1.3520", pl: "-32.10", status: "destructive" },
            ].map((trade, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="font-mono font-bold text-foreground">{trade.pair}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    trade.type === "BUY" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  }`}>
                    {trade.type}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">{trade.size} lots</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm text-muted-foreground font-mono">@ {trade.entry}</span>
                  <span className={`font-mono font-bold ${
                    trade.status === "success" ? "text-success" : "text-destructive"
                  }`}>
                    {trade.pl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
