import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { Plus, Trash2, RefreshCw, Link2, Monitor, TrendingUp, Settings2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const mt5Schema = z.object({
  account_number: z.string().min(1, "Account number is required").max(50),
  server: z.string().min(1, "Server is required").max(100),
  account_type: z.string().min(1, "Account type is required"),
  account_name: z.string().max(100).optional(),
  password: z.string().min(1, "Password is required").optional(),
  platform: z.enum(["MT5", "CTrader"]),
  ctrader_client_id: z.string().optional(),
  ctrader_client_secret: z.string().optional(),
});

export default function MT5Accounts() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    accountNumber: "", server: "", accountType: "", accountName: "",
    password: "", platform: "MT5" as "MT5" | "CTrader",
    ctraderClientId: "", ctraderClientSecret: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadAccounts(session.user.id); }
    });
  }, []);

  const loadAccounts = async (userId: string) => {
    const { data } = await supabase.from("mt5_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const validated = mt5Schema.parse({
        account_number: form.accountNumber, server: form.server,
        account_type: form.accountType, account_name: form.accountName || undefined,
        password: form.password || undefined, platform: form.platform,
        ctrader_client_id: form.ctraderClientId || undefined,
        ctrader_client_secret: form.ctraderClientSecret || undefined,
      });

      let encryptedPassword = "N/A", encryptedClientId = null, encryptedClientSecret = null;
      if (form.platform === "MT5" && validated.password) {
        const { data: enc } = await supabase.functions.invoke("encrypt-password", { body: { password: validated.password, action: "encrypt" } });
        if (enc?.encryptedPassword) encryptedPassword = enc.encryptedPassword;
      } else if (form.platform === "CTrader") {
        if (validated.ctrader_client_id) {
          const { data: idData } = await supabase.functions.invoke("encrypt-password", { body: { password: validated.ctrader_client_id, action: "encrypt" } });
          encryptedClientId = idData?.encryptedPassword;
        }
        if (validated.ctrader_client_secret) {
          const { data: secData } = await supabase.functions.invoke("encrypt-password", { body: { password: validated.ctrader_client_secret, action: "encrypt" } });
          encryptedClientSecret = secData?.encryptedPassword;
        }
      }

      const { error } = await supabase.from("mt5_accounts").insert({
        user_id: user.id,
        account_number: validated.account_number,
        server: validated.server,
        account_type: validated.account_type,
        account_name: validated.account_name,
        password_encrypted: encryptedPassword,
        platform: form.platform,
        ctrader_client_id: encryptedClientId,
        ctrader_client_secret: encryptedClientSecret,
        balance: 0, equity: 0, is_active: true,
      });
      if (error) throw error;

      toast({ title: "Account Connected", description: `${form.platform} account added successfully` });
      setShowAddModal(false);
      setForm({ accountNumber: "", server: "", accountType: "", accountName: "", password: "", platform: "MT5", ctraderClientId: "", ctraderClientSecret: "" });
      loadAccounts(user.id);
    } catch (err) {
      if (err instanceof z.ZodError) toast({ title: "Validation Error", description: err.errors[0].message, variant: "destructive" });
      else toast({ title: "Error", description: "Failed to connect account", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    const { data, error } = await supabase.functions.invoke("sync-mt5-balance", { body: { accountId } });
    if (error) toast({ title: "Sync Failed", description: "Could not sync balance", variant: "destructive" });
    else { toast({ title: "Synced", description: `Balance updated: $${data?.balance || 0}` }); if (user) loadAccounts(user.id); }
    setSyncing(null);
  };

  const handleDelete = async (accountId: string) => {
    setDeleting(accountId);
    const { error } = await supabase.from("mt5_accounts").delete().eq("id", accountId);
    if (error) toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    else { toast({ title: "Account Removed" }); if (user) loadAccounts(user.id); }
    setDeleting(null);
  };

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const activeAccounts = accounts.filter((a) => a.is_active).length;

  if (loading) return (
    <AppLayout title="Trading Accounts">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Trading Accounts" subtitle="Manage your MT5 and cTrader accounts">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Connected Accounts", value: accounts.length, icon: Link2, color: "primary" },
          { label: "Active Accounts", value: activeAccounts, icon: Monitor, color: "success" },
          { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: TrendingUp, color: "primary" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-glass rounded-xl p-5 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={cn("w-9 h-9 rounded-xl mb-3 flex items-center justify-center",
                stat.color === "success" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold font-mono">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Add Account Button */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAddModal(true)} className="gap-2 glow-primary-sm">
          <Plus className="w-4 h-4" />
          Connect Account
        </Button>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="card-glass rounded-xl py-20 text-center">
          <Link2 className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">No Accounts Connected</p>
          <p className="text-sm text-muted-foreground mb-6">Connect your MT5 or cTrader account to start trading</p>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Account
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <div
              key={account.id}
              className="card-glass rounded-xl overflow-hidden hover:border-primary/30 transition-all animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold",
                    account.platform === "CTrader" ? "bg-purple-500/15 text-purple-400" : "bg-primary/15 text-primary"
                  )}>
                    {account.platform === "CTrader" ? "cT" : "MT"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{account.account_name || account.account_number}</p>
                    <p className="text-[11px] text-muted-foreground">{account.server}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id}
                    className="w-8 h-8 rounded-lg hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", syncing === account.id && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={deleting === account.id}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/15 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {[
                  { label: "Account #", value: account.account_number },
                  { label: "Type", value: account.account_type?.charAt(0).toUpperCase() + account.account_type?.slice(1) },
                  { label: "Platform", value: account.platform || "MT5" },
                  { label: "Balance", value: `$${Number(account.balance || 0).toFixed(2)}` },
                  { label: "Equity", value: `$${Number(account.equity || 0).toFixed(2)}` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-mono font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[11px] px-2.5 py-1 rounded-full border font-medium",
                    account.is_active
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-destructive/15 text-destructive border-destructive/30"
                  )}>
                    {account.is_active ? "● Active" : "○ Inactive"}
                  </span>
                  {account.account_type === "demo" && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full border bg-warning/10 text-warning border-warning/30 font-medium">
                      Demo
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-card border-border/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect Trading Account</DialogTitle>
            <DialogDescription>Add your MT5 or cTrader account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <Label>Platform *</Label>
              <Select value={form.platform} onValueChange={(v: "MT5" | "CTrader") => setForm({ ...form, platform: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MT5">MetaTrader 5</SelectItem>
                  <SelectItem value="CTrader">cTrader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account Number *</Label>
                <Input className="mt-1.5" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} required />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input className="mt-1.5" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="e.g. Main Account" />
              </div>
            </div>
            <div>
              <Label>Server *</Label>
              <Input className="mt-1.5" value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} placeholder="e.g. ICMarkets-Demo" required />
            </div>
            <div>
              <Label>Account Type *</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.platform === "MT5" && (
              <div>
                <Label>Password *</Label>
                <Input className="mt-1.5" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            )}
            {form.platform === "CTrader" && (
              <>
                <div>
                  <Label>OAuth Client ID *</Label>
                  <Input className="mt-1.5" value={form.ctraderClientId} onChange={(e) => setForm({ ...form, ctraderClientId: e.target.value })} required />
                </div>
                <div>
                  <Label>OAuth Client Secret *</Label>
                  <Input className="mt-1.5" type="password" value={form.ctraderClientSecret} onChange={(e) => setForm({ ...form, ctraderClientSecret: e.target.value })} required />
                </div>
              </>
            )}
            <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">Your credentials are encrypted before storage. Never share your password with anyone.</p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : "Connect Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
