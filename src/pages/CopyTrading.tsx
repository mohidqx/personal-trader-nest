import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Users, Copy, Star, Zap,
  Shield, BarChart3, UserCheck, UserMinus, ChevronRight,
  Award, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

// Mock performance data for master traders
const mockPerf = () => {
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    data.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      profit: Math.floor((Math.random() - 0.3) * 800 + 200),
    });
  }
  return data;
};

function MasterTraderCard({ master, onFollow, alreadyFollowing }: { master: any; onFollow: (m: any) => void; alreadyFollowing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const perfData = mockPerf();
  const winColor = Number(master.win_rate) >= 60 ? "text-success" : Number(master.win_rate) >= 40 ? "text-warning" : "text-destructive";

  const getTier = (wr: number) => {
    if (wr >= 75) return { label: "Elite", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
    if (wr >= 60) return { label: "Pro", color: "bg-primary/15 text-primary border-primary/30" };
    return { label: "Rising", color: "bg-muted text-muted-foreground border-border" };
  };
  const tier = getTier(Number(master.win_rate || 0));

  return (
    <div className={cn("card-glass rounded-xl overflow-hidden transition-all duration-300", expanded && "ring-1 ring-primary/30")}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg">
              {(master.profiles?.full_name || "AT").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{master.profiles?.full_name || "Anonymous Trader"}</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", tier.color)}>
                  {tier.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{master.followers_count || 0} followers</p>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Win Rate", value: `${Number(master.win_rate || 0).toFixed(1)}%`, color: winColor },
            { label: "Total Profit", value: `$${Number(master.total_profit || 0).toLocaleString()}`, color: "text-foreground" },
            { label: "Trades", value: String(master.total_trades || 0), color: "text-foreground" },
          ].map((stat, i) => (
            <div key={i} className="text-center bg-muted/30 rounded-lg p-2.5">
              <p className={cn("text-sm font-bold font-mono", stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {expanded && (
          <div className="mb-4 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Monthly Performance (simulated)</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(215 20% 58%)" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 24% 12%)", border: "1px solid hsl(222 18% 18%)", borderRadius: "6px", fontSize: "11px" }}
                    formatter={(v: number) => [`$${v}`, "P&L"]}
                  />
                  <Bar dataKey="profit" radius={[3, 3, 0, 0]}
                    fill="hsl(189 100% 48%)"
                    // Color bars based on value
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {alreadyFollowing ? (
            <Button disabled variant="outline" className="flex-1 text-xs gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-success" />
              Following
            </Button>
          ) : (
            <Button onClick={() => onFollow(master)} className="flex-1 text-xs gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              Copy Trade
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setExpanded(!expanded)}>
            <BarChart3 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CopyTrading() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masterTraders, setMasterTraders] = useState<any[]>([]);
  const [myFollowing, setMyFollowing] = useState<any[]>([]);
  const [myAccounts, setMyAccounts] = useState<any[]>([]);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<any>(null);
  const [riskPercentage, setRiskPercentage] = useState(100);
  const [selectedFollowerAccount, setSelectedFollowerAccount] = useState("");
  const [selectedMasterAccount, setSelectedMasterAccount] = useState("");
  const [sortBy, setSortBy] = useState("win_rate");
  const [isMasterMode, setIsMasterMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadData(session.user.id); }
    });
  }, []);

  const loadData = async (userId: string) => {
    const [masters, following, accounts] = await Promise.all([
      supabase.from("master_trader_stats").select("*, profiles(full_name)").eq("is_accepting_followers", true).order("win_rate", { ascending: false }),
      supabase.from("copy_relationships").select("*, master_trader_stats(*, profiles(full_name))").eq("follower_user_id", userId),
      supabase.from("mt5_accounts").select("*").eq("user_id", userId),
    ]);
    setMasterTraders(masters.data || []);
    setMyFollowing(following.data || []);
    setMyAccounts(accounts.data || []);
    setLoading(false);
  };

  const handleConfirmFollow = async () => {
    if (!user || !selectedFollowerAccount || !selectedMasterAccount) {
      toast({ title: "Error", description: "Please select both accounts", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("copy_relationships").insert({
      follower_user_id: user.id,
      follower_account_id: selectedFollowerAccount,
      master_account_id: selectedMasterAccount,
      risk_percentage: riskPercentage,
      is_active: true,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Started Copying!", description: `Now copying ${selectedMaster?.profiles?.full_name || "this trader"}` });
      setShowFollowModal(false);
      loadData(user.id);
    }
  };

  const handleUnfollow = async (id: string) => {
    const { error } = await supabase.from("copy_relationships").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Unfollowed" }); if (user) loadData(user.id); }
  };

  const sorted = [...masterTraders].sort((a, b) => Number(b[sortBy] || 0) - Number(a[sortBy] || 0));
  const followingIds = new Set(myFollowing.map((r) => r.master_account_id));

  if (loading) return (
    <AppLayout title="Copy Trading">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Copy Trading" subtitle="Follow expert traders automatically">
      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Masters", value: masterTraders.length, icon: Users, color: "primary" },
          { label: "Following", value: myFollowing.length, icon: UserCheck, color: "success" },
          { label: "Avg Win Rate", value: `${masterTraders.length ? (masterTraders.reduce((s, m) => s + Number(m.win_rate || 0), 0) / masterTraders.length).toFixed(1) : 0}%`, icon: Target, color: "primary" },
          { label: "Total Profits", value: `$${masterTraders.reduce((s, m) => s + Number(m.total_profit || 0), 0).toLocaleString()}`, icon: TrendingUp, color: "success" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={cn("w-8 h-8 rounded-lg mb-3 flex items-center justify-center",
                stat.color === "primary" ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold font-mono">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* My Following */}
      {myFollowing.length > 0 && (
        <div className="card-glass rounded-xl mb-6 overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b border-border/40">
            <UserCheck className="w-4 h-4 text-success" />
            <h2 className="font-semibold text-sm">Traders You're Copying</h2>
            <Badge variant="secondary" className="ml-auto">{myFollowing.length}</Badge>
          </div>
          <div className="divide-y divide-border/30">
            {myFollowing.map((rel) => (
              <div key={rel.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-success/15 text-success border border-success/20 flex items-center justify-center font-bold text-sm">
                    {(rel.master_trader_stats?.profiles?.full_name || "T").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{rel.master_trader_stats?.profiles?.full_name || "Unknown Trader"}</p>
                    <p className="text-xs text-muted-foreground">Risk: {rel.risk_percentage}% · {rel.is_active ? "Active" : "Paused"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-success">{rel.master_trader_stats?.win_rate || 0}% WR</p>
                    <p className="text-[11px] text-muted-foreground">{rel.master_trader_stats?.total_trades || 0} trades</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleUnfollow(rel.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs">
                    <UserMinus className="w-3 h-3 mr-1" /> Unfollow
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Traders */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border/40 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Top Master Traders</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="win_rate">Win Rate</SelectItem>
                <SelectItem value="total_profit">Total Profit</SelectItem>
                <SelectItem value="total_trades">Total Trades</SelectItem>
                <SelectItem value="followers_count">Followers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-5">
          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No master traders available yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Become a master trader to appear here</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((master) => (
                <MasterTraderCard
                  key={master.id}
                  master={master}
                  onFollow={(m) => { setSelectedMaster(m); setShowFollowModal(true); }}
                  alreadyFollowing={followingIds.has(master.account_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Follow Modal */}
      <Dialog open={showFollowModal} onOpenChange={setShowFollowModal}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Copy Trade Setup</DialogTitle>
            <DialogDescription>
              Configure copy trading for {selectedMaster?.profiles?.full_name || "this trader"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold">
                  {(selectedMaster?.profiles?.full_name || "T").charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedMaster?.profiles?.full_name || "Unknown Trader"}</p>
                  <p className="text-xs text-muted-foreground">Win Rate: {selectedMaster?.win_rate || 0}% · {selectedMaster?.total_trades || 0} trades</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm">Your MT5 Account</Label>
              <Select value={selectedFollowerAccount} onValueChange={setSelectedFollowerAccount}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select your account" /></SelectTrigger>
                <SelectContent>
                  {myAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_name || acc.account_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Master's Account ID</Label>
              <Input className="mt-1.5" value={selectedMasterAccount} onChange={(e) => setSelectedMasterAccount(e.target.value)} placeholder="Enter master account ID" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm">Risk Level</Label>
                <span className={cn("text-sm font-bold font-mono",
                  riskPercentage <= 50 ? "text-success" : riskPercentage <= 100 ? "text-warning" : "text-destructive"
                )}>{riskPercentage}%</span>
              </div>
              <Slider value={[riskPercentage]} onValueChange={(v) => setRiskPercentage(v[0])} min={10} max={200} step={10} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>Conservative (10%)</span><span>Aggressive (200%)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Copy master's trades at {riskPercentage}% of their position size.
                {riskPercentage > 100 && " ⚠️ Higher risk than master."}
              </p>
            </div>

            <Button onClick={handleConfirmFollow} className="w-full gap-2">
              <Zap className="w-4 h-4" />
              Start Copying
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
