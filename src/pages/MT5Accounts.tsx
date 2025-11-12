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
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mt5Schema = z.object({
  account_number: z.string().min(1, "Account number is required").max(50),
  server: z.string().min(1, "Server is required").max(100),
  account_type: z.string().min(1, "Account type is required"),
  account_name: z.string().max(100).optional(),
  password: z.string().min(1, "Password is required"),
});

export default function MT5Accounts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [server, setServer] = useState("");
  const [accountType, setAccountType] = useState("");
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadAccounts(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadAccounts(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadAccounts = async (userId: string) => {
    const { data, error } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading accounts:", error);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validatedData = mt5Schema.parse({
        account_number: accountNumber,
        server: server,
        account_type: accountType,
        account_name: accountName || undefined,
        password: password,
      });

      // Encrypt password using edge function
      const { data: encryptData, error: encryptError } = await supabase.functions.invoke(
        'encrypt-password',
        {
          body: { password: validatedData.password, action: 'encrypt' }
        }
      );

      if (encryptError || !encryptData?.encryptedPassword) {
        throw new Error('Failed to encrypt password');
      }

      const { error } = await supabase.from("mt5_accounts").insert({
        user_id: user.id,
        account_number: validatedData.account_number,
        server: validatedData.server,
        account_type: validatedData.account_type,
        account_name: validatedData.account_name,
        password_encrypted: encryptData.encryptedPassword,
        balance: 0,
        equity: 0,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "MT5 account connected successfully",
      });

      setShowAddModal(false);
      setAccountNumber("");
      setServer("");
      setAccountType("");
      setAccountName("");
      setPassword("");
      loadAccounts(user.id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to connect MT5 account",
          variant: "destructive",
        });
      }
    }
  };

  const handleSyncBalance = async (accountId: string) => {
    const { data, error } = await supabase.functions.invoke("sync-mt5-balance", {
      body: { accountId },
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to sync balance",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Balance synced: $${data.balance}`,
      });
      if (user) loadAccounts(user.id);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const { error } = await supabase
      .from("mt5_accounts")
      .delete()
      .eq("id", accountId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      if (user) loadAccounts(user.id);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add MT5 Account
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No MT5 accounts connected</p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{account.account_name || account.account_number}</CardTitle>
                      <CardDescription>{account.server}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSyncBalance(account.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account #</span>
                      <span className="text-sm font-medium">{account.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm font-medium capitalize">{account.account_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="text-sm font-medium">${account.balance?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className={`text-sm font-medium ${account.is_active ? "text-green-600" : "text-red-600"}`}>
                        {account.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect MT5 Account</DialogTitle>
            <DialogDescription>Add your MetaTrader 5 trading account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="server">Server *</Label>
              <Input
                id="server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="e.g., ICMarkets-Demo"
                required
              />
            </div>
            <div>
              <Label htmlFor="accountType">Account Type *</Label>
              <Select value={accountType} onValueChange={setAccountType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="accountName">Account Name (Optional)</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Main Trading Account"
              />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Connect Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
