import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle, XCircle, Users, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [copyRelationships, setCopyRelationships] = useState<any[]>([]);

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
      .single();

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
    // Load pending transactions
    const { data: txns } = await supabase
      .from("transactions")
      .select("*, profiles(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setTransactions(txns || []);

    // Load users
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*, wallets(balance)")
      .order("created_at", { ascending: false });

    setUsers(usersData || []);

    // Load copy relationships
    const { data: relationships } = await supabase
      .from("copy_relationships")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });

    setCopyRelationships(relationships || []);
    setLoading(false);
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
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="transactions">Pending Transactions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="copy-trading">Copy Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
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
