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
import { ArrowLeft, Wallet as WalletIcon, DollarSign, TrendingUp, Download, Bitcoin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const transactionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive").max(1000000, "Amount too large"),
  payment_method: z.string().min(1, "Payment method is required").max(100),
  notes: z.string().max(500, "Notes too long").optional(),
});

export default function Wallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("crypto");
  const [depositNotes, setDepositNotes] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [cryptoQR, setCryptoQR] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadWallet(session.user.id);
        loadTransactions(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadWallet(session.user.id);
        loadTransactions(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadWallet = async (userId: string) => {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error loading wallet:", error);
    } else {
      setWallet(data);
    }
    setLoading(false);
  };

  const loadTransactions = async (userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading transactions:", error);
    } else {
      setTransactions(data || []);
    }
  };

  const handleCryptoDeposit = async () => {
    if (!wallet || !user || !depositAmount) return;

    try {
      const validatedData = transactionSchema.parse({
        amount: depositAmount,
        payment_method: "crypto",
        notes: `${cryptoNetwork} deposit`,
      });

      const { data, error } = await supabase.functions.invoke("generate-crypto-address", {
        body: { 
          amount: validatedData.amount,
          currency: "USDT",
          network: cryptoNetwork 
        },
      });

      if (error) throw error;

      setCryptoAddress(data.address);
      setCryptoQR(data.qrCode);
      setShowDepositModal(false);
      setShowCryptoModal(true);

      toast({
        title: "Crypto Address Generated",
        description: "Send funds to the address below",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate crypto address",
        variant: "destructive",
      });
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositMethod === "crypto") {
      handleCryptoDeposit();
      return;
    }
    
    if (!wallet || !user) return;

    try {
      const validatedData = transactionSchema.parse({
        amount: depositAmount,
        payment_method: depositMethod,
        notes: depositNotes,
      });

      const { error } = await supabase.rpc("process_transaction", {
        p_user_id: user.id,
        p_wallet_id: wallet.id,
        p_amount: validatedData.amount,
        p_type: "deposit",
        p_payment_method: validatedData.payment_method,
        p_notes: validatedData.notes,
      });

      if (error) throw error;

      toast({
        title: "Deposit Request Submitted",
        description: "Your deposit request is pending admin approval.",
      });

      setShowDepositModal(false);
      setDepositAmount("");
      setDepositMethod("crypto");
      setDepositNotes("");
      loadTransactions(user.id);
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
          description: "Failed to submit deposit request",
          variant: "destructive",
        });
      }
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !user) return;

    try {
      const validatedData = transactionSchema.parse({
        amount: withdrawAmount,
        payment_method: withdrawMethod,
        notes: withdrawNotes,
      });

      if (wallet.balance < validatedData.amount) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough balance for this withdrawal",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.rpc("process_transaction", {
        p_user_id: user.id,
        p_wallet_id: wallet.id,
        p_amount: validatedData.amount,
        p_type: "withdrawal",
        p_payment_method: validatedData.payment_method,
        p_notes: validatedData.notes,
      });

      if (error) throw error;

      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request is pending admin approval.",
      });

      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawMethod("");
      setWithdrawNotes("");
      loadTransactions(user.id);
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
          description: "Failed to submit withdrawal request",
          variant: "destructive",
        });
      }
    }
  };

  const handleExport = () => {
    const csv = [
      ["Date", "Type", "Amount", "Status", "Method", "Notes"].join(","),
      ...transactions.map((t) =>
        [
          new Date(t.created_at).toLocaleDateString(),
          t.type,
          t.amount,
          t.status,
          t.payment_method || "",
          t.notes || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Transactions exported successfully",
    });
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

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <WalletIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${wallet?.balance?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">{wallet?.currency || "USD"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => setShowDepositModal(true)} className="flex-1">
                <DollarSign className="mr-2 h-4 w-4" />
                Deposit
              </Button>
              <Button onClick={() => setShowWithdrawModal(true)} variant="outline" className="flex-1">
                <TrendingUp className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExport} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center border-b pb-4">
                    <div>
                      <p className="font-medium capitalize">{transaction.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                        {transaction.type === "deposit" ? "+" : "-"}${transaction.amount}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">{transaction.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit Funds</DialogTitle>
            <DialogDescription>Submit a deposit request for admin approval</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <Label htmlFor="depositAmount">Amount</Label>
              <Input
                id="depositAmount"
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="depositMethod">Payment Method</Label>
              <Select value={depositMethod} onValueChange={setDepositMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {depositMethod === "crypto" && (
              <div>
                <Label htmlFor="network">Network</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                    <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                    <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="depositNotes">Notes (Optional)</Label>
              <Input
                id="depositNotes"
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              {depositMethod === "crypto" ? (
                <>
                  <Bitcoin className="mr-2 h-4 w-4" />
                  Generate Crypto Address
                </>
              ) : (
                "Submit Deposit Request"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>Submit a withdrawal request for admin approval</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div>
              <Label htmlFor="withdrawAmount">Amount</Label>
              <Input
                id="withdrawAmount"
                type="number"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="withdrawMethod">Payment Method</Label>
              <Input
                id="withdrawMethod"
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="withdrawNotes">Notes (Optional)</Label>
              <Input
                id="withdrawNotes"
                value={withdrawNotes}
                onChange={(e) => setWithdrawNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">Submit Withdrawal Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCryptoModal} onOpenChange={setShowCryptoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crypto Deposit Address</DialogTitle>
            <DialogDescription>
              Send USDT to the address below (Network: {cryptoNetwork})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cryptoQR && (
              <div className="flex justify-center">
                <img src={cryptoQR} alt="QR Code" className="rounded-lg" />
              </div>
            )}
            <div>
              <Label>Deposit Address</Label>
              <div className="flex gap-2 mt-2">
                <Input value={cryptoAddress} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(cryptoAddress);
                    toast({
                      title: "Copied",
                      description: "Address copied to clipboard",
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Only send USDT on {cryptoNetwork} network</li>
                <li>• Minimum deposit: $10</li>
                <li>• Funds will be credited after confirmation</li>
                <li>• This address expires in 1 hour</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
