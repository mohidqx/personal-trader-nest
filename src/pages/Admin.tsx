import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Users, 
  DollarSign,
  TrendingUp,
  Activity,
  UserPlus,
  Wallet as WalletIcon,
  BarChart3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface FinancialStats {
  totalDeposits: number;
  totalWithdrawals: number;
  pendingTransactions: number;
  totalBalance: number;
}

interface TradingStats {
  totalTrades: number;
  activeTrades: number;
  totalProfit: number;
  avgWinRate: number;
}

interface RecentUser {
  user_id: string;
  full_name: string;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [copyRelationships, setCopyRelationships] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  });
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingTransactions: 0,
    totalBalance: 0,
  });
  const [tradingStats, setTradingStats] = useState<TradingStats>({
    totalTrades: 0,
    activeTrades: 0,
    totalProfit: 0,
    avgWinRate: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    loadData();
  };

  const loadData = async () => {
    await Promise.all([
      loadTransactions(),
      loadUsers(),
      loadCopyRelationships(),
      loadUserStats(),
      loadFinancialStats(),
      loadTradingStats(),
      loadRecentUsers(),
    ]);
    setLoading(false);
  };

  const loadTransactions = async () => {
    const { data: txns } = await supabase
      .from("transactions")
      .select("*, profiles(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false});

    setTransactions(txns || []);
  };

  const loadUsers = async () => {
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*, wallets(balance)")
      .order("created_at", { ascending: false });

    setUsers(usersData || []);
  };

  const loadCopyRelationships = async () => {
    const { data: relationships } = await supabase
      .from("copy_relationships")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });

    setCopyRelationships(relationships || []);
  };

  const loadUserStats = async () => {
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("user_id, created_at");

    if (!allUsers) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    setUserStats({
      totalUsers: allUsers.length,
      activeUsers: allUsers.length,
      newUsersToday: allUsers.filter(u => new Date(u.created_at) >= today).length,
      newUsersThisWeek: allUsers.filter(u => new Date(u.created_at) >= weekAgo).length,
      newUsersThisMonth: allUsers.filter(u => new Date(u.created_at) >= monthAgo).length,
    });
  };

  const loadFinancialStats = async () => {
    const { data: allTransactions } = await supabase
      .from("transactions")
      .select("type, amount, status");

    const { data: wallets } = await supabase
      .from("wallets")
      .select("balance");

    if (!allTransactions) return;

    const completedTxns = allTransactions.filter(t => t.status === 'completed');
    const pendingTxns = allTransactions.filter(t => t.status === 'pending');

    setFinancialStats({
      totalDeposits: completedTxns
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalWithdrawals: completedTxns
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      pendingTransactions: pendingTxns.length,
      totalBalance: wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0,
    });
  };

  const loadTradingStats = async () => {
    const { data: allTrades } = await supabase
      .from("trades")
      .select("status, profit, closed_at");

    if (!allTrades) return;

    const closedTrades = allTrades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => Number(t.profit) > 0);

    setTradingStats({
      totalTrades: allTrades.length,
      activeTrades: allTrades.filter(t => t.status === 'open').length,
      totalProfit: closedTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0),
      avgWinRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    });
  };

  const loadRecentUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    setRecentUsers(data || []);
  };

  const handleApproveTransaction = async (transactionId: string) => {
    const { error } = await supabase.rpc("approve_transaction", {
      p_transaction_id: transactionId,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Transaction approved",
      });
      loadData();
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ status: "rejected" })
      .eq("id", transactionId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Transaction rejected",
      });
      loadData();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">System overview and management</p>
            </div>
          </div>
          <Badge variant="secondary" className="px-4 py-2">
            Admin Panel
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="copy-trading">Copy Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* User Statistics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {userStats.newUsersToday} new today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New This Week</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.newUsersThisWeek}</div>
                  <p className="text-xs text-muted-foreground">
                    Last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.newUsersThisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Financial Statistics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${financialStats.totalDeposits.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${financialStats.totalWithdrawals.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <WalletIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${financialStats.totalBalance.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all wallets
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{financialStats.pendingTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Trading Statistics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradingStats.totalTrades}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradingStats.activeTrades}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently open
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${tradingStats.totalProfit.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    All closed trades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradingStats.avgWinRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    System wide
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Signups */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Signups</CardTitle>
                <CardDescription>Latest users who joined the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No users yet</p>
                  ) : (
                    recentUsers.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <p className="font-medium text-foreground">{user.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()} at{" "}
                            {new Date(user.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="outline">New</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Transactions</CardTitle>
                <CardDescription>Review and approve user transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pending transactions</p>
                  ) : (
                    transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center border-b pb-4">
                        <div>
                          <p className="font-medium capitalize">{transaction.type}</p>
                          <p className="text-sm text-muted-foreground">
                            Amount: ${transaction.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Method: {transaction.payment_method}
                          </p>
                          {transaction.notes && (
                            <p className="text-sm text-muted-foreground">Notes: {transaction.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveTransaction(transaction.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectTransaction(transaction.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Users className="inline mr-2 h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>View all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userData) => (
                    <div key={userData.id} className="flex justify-between items-center border-b pb-4">
                      <div>
                        <p className="font-medium">{userData.full_name || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">{userData.phone || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">{userData.country || "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          <DollarSign className="inline h-4 w-4" />
                          {userData.wallets?.[0]?.balance?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="copy-trading">
            <Card>
              <CardHeader>
                <CardTitle>Copy Trading Relationships</CardTitle>
                <CardDescription>View active copy trading connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {copyRelationships.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No active relationships</p>
                  ) : (
                    copyRelationships.map((rel) => (
                      <div key={rel.id} className="flex justify-between items-center border-b pb-4">
                        <div>
                          <p className="font-medium">Follower: {rel.profiles?.full_name || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">
                            Risk: {rel.risk_percentage}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {rel.is_active ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
