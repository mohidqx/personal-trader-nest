import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, Users, DollarSign, TrendingUp,
  Activity, UserPlus, Wallet as WalletIcon, BarChart3, RefreshCw,
  AlertTriangle, ArrowUpRight, Bell
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ total: 0, today: 0, week: 0, month: 0 });
  const [financialStats, setFinancialStats] = useState({ deposits: 0, withdrawals: 0, pending: 0, totalBalance: 0 });
  const [tradingStats, setTradingStats] = useState({ total: 0, active: 0, profit: 0, winRate: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; txId: string; txAmount: number; txType: string }>({ open: false, txId: "", txAmount: 0, txType: "" });
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { navigate("/auth"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
    if (!roles) {
      toast({ title: "Access Denied", description: "Admin access required", variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    setIsAdmin(true);
    await loadAll();
    setLoading(false);
  };

  const loadAll = async () => {
    await Promise.all([loadTransactions(), loadUsers(), loadStats()]);
  };

  const loadTransactions = async () => {
    const { data } = await supabase.from("transactions").select("*, profiles(full_name, username)").eq("status", "pending").order("created_at", { ascending: false });
    setTransactions(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*, wallets(balance)").order("created_at", { ascending: false }).limit(50);
    setUsers(data || []);

    if (data) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const week = new Date(today); week.setDate(week.getDate() - 7);
      const month = new Date(today); month.setMonth(month.getMonth() - 1);
      setUserStats({
        total: data.length,
        today: data.filter(u => new Date(u.created_at) >= today).length,
        week: data.filter(u => new Date(u.created_at) >= week).length,
        month: data.filter(u => new Date(u.created_at) >= month).length,
      });
      setRecentUsers(data.slice(0, 8));

      // Growth chart data
      const growth: any[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const count = data.filter(u => {
          const c = new Date(u.created_at);
          return c >= monthStart && c <= monthEnd;
        }).length;
        growth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), users: count });
      }
      setGrowthData(growth);
    }
  };

  const loadStats = async () => {
    const [txns, wallets, trades] = await Promise.all([
      supabase.from("transactions").select("type, amount, status"),
      supabase.from("wallets").select("balance"),
      supabase.from("trades").select("status, profit"),
    ]);

    if (txns.data) {
      const completed = txns.data.filter(t => t.status === "completed");
      setFinancialStats({
        deposits: completed.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0),
        withdrawals: completed.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0),
        pending: txns.data.filter(t => t.status === "pending").length,
        totalBalance: wallets.data?.reduce((s, w) => s + Number(w.balance), 0) || 0,
      });
    }

    if (trades.data) {
      const closed = trades.data.filter(t => t.status === "closed");
      const wins = closed.filter(t => Number(t.profit) > 0);
      setTradingStats({
        total: trades.data.length,
        active: trades.data.filter(t => t.status === "open").length,
        profit: closed.reduce((s, t) => s + Number(t.profit || 0), 0),
        winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      });
    }
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.rpc("approve_transaction", { p_transaction_id: id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Approved ✓" }); loadTransactions(); loadStats(); }
  };

  const handleReject = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    setRejectReason("");
    setRejectModal({ open: true, txId: id, txAmount: tx?.amount || 0, txType: tx?.type || "" });
  };

  const handleConfirmReject = async () => {
    const { error } = await supabase.rpc("reject_transaction" as any, {
      p_transaction_id: rejectModal.txId,
      p_reason: rejectReason || "No reason provided",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Rejected", description: "User has been notified." });
      setRejectModal({ open: false, txId: "", txAmount: 0, txType: "" });
      loadTransactions();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    toast({ title: "Refreshed" });
  };

  if (loading) return (
    <AppLayout title="Admin">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  if (!isAdmin) return null;

  return (
    <AppLayout title="Admin Dashboard" subtitle="Platform overview and management">
      <div className="flex items-center justify-between mb-6">
        <Badge variant="secondary" className="bg-warning/15 text-warning border border-warning/30 px-3 py-1">
          Admin Panel
        </Badge>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card/80 border border-border/60 p-1 rounded-xl gap-1">
          {["overview", "transactions", "users"].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="rounded-lg capitalize text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: userStats.total, sub: `+${userStats.today} today`, icon: Users, color: "primary" },
              { label: "Total Balance", value: `$${financialStats.totalBalance.toFixed(0)}`, sub: "Across all wallets", icon: WalletIcon, color: "success" },
              { label: "Total Deposits", value: `$${financialStats.deposits.toFixed(0)}`, sub: "Completed", icon: DollarSign, color: "success" },
              { label: "Pending Txns", value: financialStats.pending, sub: "Awaiting approval", icon: AlertTriangle, color: financialStats.pending > 0 ? "warning" : "muted" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="card-glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className={cn("w-8 h-8 rounded-lg mb-3 flex items-center justify-center",
                    stat.color === "primary" ? "bg-primary/15 text-primary" :
                    stat.color === "success" ? "bg-success/15 text-success" :
                    stat.color === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{stat.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth */}
            <div className="card-glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">User Growth (12 months)</h3>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 18%)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "hsl(215 20% 58%)", fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                    <Tooltip contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="users" fill="hsl(189 100% 48%)" radius={[3, 3, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trading Stats */}
            <div className="card-glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Trading Overview</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Total Trades", value: tradingStats.total, icon: Activity },
                  { label: "Active Trades", value: tradingStats.active, icon: Activity },
                  { label: "Total Profit", value: `$${tradingStats.profit.toFixed(2)}`, icon: TrendingUp },
                  { label: "Avg Win Rate", value: `${tradingStats.winRate.toFixed(1)}%`, icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-mono font-semibold">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Signups */}
          <div className="card-glass rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Recent Signups</h3>
              </div>
              <Badge variant="secondary">{userStats.week} this week</Badge>
            </div>
            <div className="divide-y divide-border/30">
              {recentUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {(user.full_name || user.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.full_name || user.username || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">@{user.username || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-medium text-success">
                      ${Number(user.wallets?.[0]?.balance || 0).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TRANSACTIONS */}
        <TabsContent value="transactions">
          <div className="card-glass rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Pending Transactions</h3>
              </div>
              <Badge variant="secondary" className={cn(transactions.length > 0 && "bg-warning/15 text-warning border border-warning/30")}>
                {transactions.length} pending
              </Badge>
            </div>
            <div className="divide-y divide-border/30">
              {transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="w-10 h-10 text-success/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">All caught up! No pending transactions.</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                        tx.type === "deposit" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      )}>
                        <ArrowUpRight className={cn("w-4 h-4", tx.type !== "deposit" && "rotate-180")} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.profiles?.full_name || tx.profiles?.username || "Unknown"} ·
                          {" "}{new Date(tx.created_at).toLocaleDateString()} ·
                          {tx.payment_method && ` ${tx.payment_method}`}
                        </p>
                        {tx.notes && <p className="text-xs text-muted-foreground/70">{tx.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-sm font-mono font-bold",
                        tx.type === "deposit" ? "text-success" : "text-destructive"
                      )}>
                        {tx.type === "deposit" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(tx.id)} className="h-8 text-xs gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(tx.id)} className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users">
          <div className="card-glass rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">All Users</h3>
              </div>
              <Badge variant="secondary">{userStats.total} total</Badge>
            </div>
            <div className="divide-y divide-border/30">
              {users.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {(u.full_name || u.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">@{u.username || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-success">
                      ${Number(u.wallets?.[0]?.balance || 0).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => setRejectModal(prev => ({ ...prev, open: o }))}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Reject Transaction
            </DialogTitle>
            <DialogDescription>
              Rejecting {rejectModal.txType} of ${rejectModal.txAmount.toFixed(2)}. The user will be notified with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Rejection Reason <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                className="mt-1.5"
                placeholder="e.g. Insufficient verification documents..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleConfirmReject}>
                <Bell className="w-3.5 h-3.5" />
                Reject & Notify User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
