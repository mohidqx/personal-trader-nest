import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import {
  ArrowUpRight, ArrowDownRight, Download, Bitcoin,
  DollarSign, TrendingDown, Clock, CheckCircle, XCircle,
  Wallet as WalletIcon, Copy, RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const transactionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive").max(1000000, "Amount too large"),
  payment_method: z.string().min(1, "Payment method is required").max(100),
  notes: z.string().max(500, "Notes too long").optional(),
});

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  completed: { label: "Completed", color: "bg-success/15 text-success border-success/30", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

export default function Wallet() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
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
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        Promise.all([loadWallet(session.user.id), loadTransactions(session.user.id)]).then(() =>
          setLoading(false)
        );
      }
    });
  }, []);

  const loadWallet = async (userId: string) => {
    const { data } = await supabase.from("wallets").select("*").eq("user_id", userId).single();
    if (data) setWallet(data);
  };

  const loadTransactions = async (userId: string) => {
    const { data } = await supabase
      .from("transactions").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(50);
    if (data) setTransactions(data);
  };

  const handleCryptoDeposit = async () => {
    if (!wallet || !user || !depositAmount) return;
    setSubmitting(true);
    try {
      const validated = transactionSchema.parse({ amount: depositAmount, payment_method: "crypto", notes: `${cryptoNetwork} deposit` });
      const { data, error } = await supabase.functions.invoke("generate-crypto-address", {
        body: { amount: validated.amount, currency: "USDT", network: cryptoNetwork },
      });
      if (error) throw error;
      setCryptoAddress(data.address);
      setCryptoQR(data.qrCode);
      setShowDepositModal(false);
      setShowCryptoModal(true);
    } catch {
      toast({ title: "Error", description: "Failed to generate crypto address", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositMethod === "crypto") { handleCryptoDeposit(); return; }
    if (!wallet || !user) return;
    setSubmitting(true);
    try {
      const validated = transactionSchema.parse({ amount: depositAmount, payment_method: depositMethod, notes: depositNotes });
      const { error } = await supabase.rpc("process_transaction", {
        p_user_id: user.id, p_wallet_id: wallet.id, p_amount: validated.amount,
        p_type: "deposit", p_payment_method: validated.payment_method, p_notes: validated.notes,
      });
      if (error) throw error;
      toast({ title: "Deposit Submitted", description: "Your deposit is pending admin approval." });
      setShowDepositModal(false);
      setDepositAmount(""); setDepositMethod("crypto"); setDepositNotes("");
      await loadTransactions(user.id);
    } catch (err) {
      if (err instanceof z.ZodError) toast({ title: "Validation Error", description: err.errors[0].message, variant: "destructive" });
      else toast({ title: "Error", description: "Failed to submit deposit", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !user) return;
    setSubmitting(true);
    try {
      const validated = transactionSchema.parse({ amount: withdrawAmount, payment_method: withdrawMethod, notes: withdrawNotes });
      if (wallet.balance < validated.amount) {
        toast({ title: "Insufficient Balance", description: "Not enough funds for this withdrawal", variant: "destructive" });
        return;
      }
      const { error } = await supabase.rpc("process_transaction", {
        p_user_id: user.id, p_wallet_id: wallet.id, p_amount: validated.amount,
        p_type: "withdrawal", p_payment_method: validated.payment_method, p_notes: validated.notes,
      });
      if (error) throw error;
      toast({ title: "Withdrawal Submitted", description: "Your withdrawal is pending admin approval." });
      setShowWithdrawModal(false);
      setWithdrawAmount(""); setWithdrawMethod(""); setWithdrawNotes("");
      await loadTransactions(user.id);
    } catch (err) {
      if (err instanceof z.ZodError) toast({ title: "Validation Error", description: err.errors[0].message, variant: "destructive" });
      else toast({ title: "Error", description: "Failed to submit withdrawal", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleExport = () => {
    const csv = [
      ["Date", "Type", "Amount", "Status", "Method", "Notes"].join(","),
      ...transactions.map((t) => [
        new Date(t.created_at).toLocaleDateString(), t.type, t.amount, t.status,
        t.payment_method || "", t.notes || "",
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Transactions downloaded as CSV" });
  };

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter || t.status === filter);
  const totalDeposited = transactions.filter((t) => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawn = transactions.filter((t) => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const pending = transactions.filter((t) => t.status === "pending").length;

  if (loading) return (
    <AppLayout title="Wallet">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Wallet" subtitle="Manage your funds">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Available Balance", value: `$${Number(wallet?.balance || 0).toFixed(2)}`, icon: WalletIcon, color: "primary", sub: wallet?.currency || "USD" },
          { label: "Total Deposited", value: `$${totalDeposited.toFixed(2)}`, icon: ArrowUpRight, color: "success", sub: "Completed" },
          { label: "Total Withdrawn", value: `$${totalWithdrawn.toFixed(2)}`, icon: ArrowDownRight, color: "destructive", sub: "Completed" },
          { label: "Pending", value: pending.toString(), icon: Clock, color: "warning", sub: "Awaiting approval" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card-glass rounded-xl p-5 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", {
                  "bg-primary/15 text-primary": card.color === "primary",
                  "bg-success/15 text-success": card.color === "success",
                  "bg-destructive/15 text-destructive": card.color === "destructive",
                  "bg-warning/15 text-warning": card.color === "warning",
                })}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-mono mt-1">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => setShowDepositModal(true)} className="gap-2 glow-primary-sm">
          <ArrowUpRight className="w-4 h-4" />
          Deposit Funds
        </Button>
        <Button onClick={() => setShowWithdrawModal(true)} variant="outline" className="gap-2">
          <ArrowDownRight className="w-4 h-4" />
          Withdraw
        </Button>
        <Button onClick={() => loadTransactions(user?.id)} variant="ghost" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button onClick={handleExport} variant="ghost" className="gap-2 ml-auto">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Transactions */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <h2 className="font-semibold">Transaction History</h2>
          <div className="flex gap-1">
            {["all", "deposit", "withdrawal", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                  filter === f ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <WalletIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            filtered.map((tx) => {
              const cfg = statusConfig[tx.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                      tx.type === "deposit" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    )}>
                      {tx.type === "deposit" ? <ArrowUpRight className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·
                        {tx.payment_method && ` ${tx.payment_method}`}
                      </p>
                      {tx.notes && <p className="text-xs text-muted-foreground/70">{tx.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1", cfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className={cn("font-mono font-bold text-sm",
                      tx.type === "deposit" ? "text-success" : "text-destructive"
                    )}>
                      {tx.type === "deposit" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Deposit Funds</DialogTitle>
            <DialogDescription>Submit a deposit request</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={depositMethod} onValueChange={setDepositMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {depositMethod === "crypto" && (
              <div>
                <Label>Network</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRC20">TRC20 (Tron) — Low fees</SelectItem>
                    <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                    <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes (Optional)</Label>
              <Input value={depositNotes} onChange={(e) => setDepositNotes(e.target.value)} placeholder="Reference or notes..." />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...</> :
                depositMethod === "crypto" ? <><Bitcoin className="w-4 h-4 mr-2" /> Generate Address</> : "Submit Deposit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>Available: ${Number(wallet?.balance || 0).toFixed(2)}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <Label>Withdrawal Method</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes / Wallet Address</Label>
              <Input value={withdrawNotes} onChange={(e) => setWithdrawNotes(e.target.value)} placeholder="Destination wallet or bank info..." required />
            </div>
            <Button type="submit" className="w-full" variant="destructive" disabled={submitting}>
              {submitting ? "Processing..." : "Submit Withdrawal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Crypto Address Modal */}
      <Dialog open={showCryptoModal} onOpenChange={setShowCryptoModal}>
        <DialogContent className="bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Send USDT to this address</DialogTitle>
            <DialogDescription>Network: {cryptoNetwork} · Minimum 10 USDT</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cryptoQR && (
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <img src={cryptoQR} alt="QR Code" className="w-40 h-40" />
              </div>
            )}
            <div>
              <Label>Deposit Address</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={cryptoAddress} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(cryptoAddress);
                  toast({ title: "Copied!", description: "Address copied to clipboard" });
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl">
              <p className="text-xs text-warning font-medium">⚠️ Important</p>
              <p className="text-xs text-muted-foreground mt-1">Only send USDT on the {cryptoNetwork} network. Sending other tokens may result in permanent loss.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
