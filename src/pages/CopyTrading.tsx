import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, TrendingUp, Users, Copy } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function CopyTrading() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [masterTraders, setMasterTraders] = useState<any[]>([]);
  const [myFollowing, setMyFollowing] = useState<any[]>([]);
  const [myAccounts, setMyAccounts] = useState<any[]>([]);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<any>(null);
  const [riskPercentage, setRiskPercentage] = useState(100);
  const [selectedFollowerAccount, setSelectedFollowerAccount] = useState("");
  const [selectedMasterAccount, setSelectedMasterAccount] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadData(session.user.id);
      } else {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const loadData = async (userId: string) => {
    // Load master traders
    const { data: masters } = await supabase
      .from("master_trader_stats")
      .select("*, profiles(full_name)")
      .eq("is_accepting_followers", true)
      .order("win_rate", { ascending: false });

    setMasterTraders(masters || []);

    // Load my following
    const { data: following } = await supabase
      .from("copy_relationships")
      .select("*, master_trader_stats(*, profiles(full_name))")
      .eq("follower_user_id", userId);

    setMyFollowing(following || []);

    // Load my MT5 accounts
    const { data: accounts } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", userId);

    setMyAccounts(accounts || []);
    setLoading(false);
  };

  const handleFollowMaster = async (master: any) => {
    setSelectedMaster(master);
    setShowFollowModal(true);
  };

  const handleConfirmFollow = async () => {
    if (!user || !selectedFollowerAccount || !selectedMasterAccount) {
      toast({
        title: "Error",
        description: "Please select both accounts",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("copy_relationships").insert({
      follower_user_id: user.id,
      follower_account_id: selectedFollowerAccount,
      master_account_id: selectedMasterAccount,
      risk_percentage: riskPercentage,
      is_active: true,
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
        description: "Now following master trader",
      });
      setShowFollowModal(false);
      loadData(user.id);
    }
  };

  const handleUnfollow = async (relationshipId: string) => {
    const { error } = await supabase
      .from("copy_relationships")
      .delete()
      .eq("id", relationshipId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Unfollowed master trader",
      });
      if (user) loadData(user.id);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-8">Copy Trading</h1>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>
                <Users className="inline mr-2 h-5 w-5" />
                My Following
              </CardTitle>
              <CardDescription>Traders you're currently copying</CardDescription>
            </CardHeader>
            <CardContent>
              {myFollowing.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Not following anyone yet</p>
              ) : (
                <div className="space-y-4">
                  {myFollowing.map((rel) => (
                    <div key={rel.id} className="flex justify-between items-center border-b pb-4">
                      <div>
                        <p className="font-medium">
                          {rel.master_trader_stats?.profiles?.full_name || "Unknown Trader"}
                        </p>
                        <p className="text-sm text-muted-foreground">Risk: {rel.risk_percentage}%</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUnfollow(rel.id)}
                      >
                        Unfollow
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <TrendingUp className="inline mr-2 h-5 w-5" />
                Top Master Traders
              </CardTitle>
              <CardDescription>Browse and copy successful traders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {masterTraders.map((master) => (
                  <Card key={master.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {master.profiles?.full_name || "Anonymous Trader"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Win Rate</span>
                          <span className="font-bold text-green-600">{master.win_rate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Profit</span>
                          <span className="font-bold">${master.total_profit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Followers</span>
                          <span className="font-bold">{master.followers_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Trades</span>
                          <span className="font-bold">{master.total_trades}</span>
                        </div>
                        <Button
                          className="w-full mt-4"
                          onClick={() => handleFollowMaster(master)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Follow
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showFollowModal} onOpenChange={setShowFollowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Follow Master Trader</DialogTitle>
            <DialogDescription>
              Set up copy trading for {selectedMaster?.profiles?.full_name || "this trader"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your MT5 Account</Label>
              <select
                className="w-full mt-2 p-2 border rounded"
                value={selectedFollowerAccount}
                onChange={(e) => setSelectedFollowerAccount(e.target.value)}
              >
                <option value="">Select account</option>
                {myAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name || acc.account_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Master's Account</Label>
              <Input
                value={selectedMasterAccount}
                onChange={(e) => setSelectedMasterAccount(e.target.value)}
                placeholder="Master account ID"
              />
            </div>
            <div>
              <Label>Risk Percentage: {riskPercentage}%</Label>
              <Slider
                value={[riskPercentage]}
                onValueChange={(val) => setRiskPercentage(val[0])}
                min={10}
                max={200}
                step={10}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Copy trades at {riskPercentage}% of master's position size
              </p>
            </div>
            <Button onClick={handleConfirmFollow} className="w-full">
              Start Copying
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
