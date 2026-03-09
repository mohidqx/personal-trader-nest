import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { Key, Shield, CheckCircle, AlertTriangle, Lock, RefreshCw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import * as OTPAuth from "otplib";

export default function Security() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); }
    });
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data) { setProfile(data); setTwoFactorEnabled(data.two_factor_enabled || false); }
    setLoading(false);
  };

  const handleEnable2FA = async () => {
    if (!user) return;
    const secret = OTPAuth.authenticator.generateSecret();
    const otpauthUrl = `otpauth://totp/TradePro:${user.email}?secret=${secret}&issuer=TradePro`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauthUrl)}`;
    setQrCodeUrl(qrUrl);
    await supabase.from("profiles").update({ two_factor_secret: secret }).eq("user_id", user.id);
    await loadProfile(user.id);
  };

  const handleVerify2FA = async () => {
    if (!user || !verificationCode || !profile?.two_factor_secret) return;
    setVerifying(true);
    try {
      const isValid = OTPAuth.authenticator.verify({ token: verificationCode, secret: profile.two_factor_secret });
      if (!isValid) { toast({ title: "Invalid Code", description: "Incorrect verification code", variant: "destructive" }); return; }
      await supabase.from("profiles").update({ two_factor_enabled: true }).eq("user_id", user.id);
      toast({ title: "2FA Enabled", description: "Your account is now protected." });
      setTwoFactorEnabled(true); setQrCodeUrl(""); setVerificationCode("");
    } finally { setVerifying(false); }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ two_factor_enabled: false, two_factor_secret: null }).eq("user_id", user.id);
    toast({ title: "2FA Disabled" });
    setTwoFactorEnabled(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast({ title: "Mismatch", description: "Passwords don't match", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "Too Short", description: "Password must be at least 8 characters", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password Changed", description: "Your password has been updated." }); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const securityScore = () => {
    let score = 40;
    if (twoFactorEnabled) score += 40;
    if (profile?.phone) score += 10;
    if (profile?.full_name) score += 10;
    return score;
  };
  const score = securityScore();

  if (loading) return (
    <AppLayout title="Security">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Security" subtitle="Protect your account">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Security Score */}
        <div className="card-glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Security Score</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {score >= 80 ? "Excellent security" : score >= 60 ? "Good — enable 2FA for better protection" : "Weak — please improve your security"}
              </p>
            </div>
            <div className={cn(
              "text-3xl font-bold font-mono",
              score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive"
            )}>
              {score}%
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700",
                score >= 80 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-destructive"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: "Email Verified", done: !!user?.email },
              { label: "2FA Enabled", done: twoFactorEnabled },
              { label: "Phone Added", done: !!profile?.phone },
              { label: "Profile Complete", done: !!profile?.full_name },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded-full flex items-center justify-center",
                  item.done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                )}>
                  <CheckCircle className="w-2.5 h-2.5" />
                </div>
                <span className={cn("text-xs", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2FA */}
        <div className="card-glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Two-Factor Authentication</h3>
            </div>
            <span className={cn("text-[11px] px-2.5 py-1 rounded-full border font-medium",
              twoFactorEnabled ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"
            )}>
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="p-5">
            {!twoFactorEnabled ? (
              !qrCodeUrl ? (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Add an extra layer of security</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Use an authenticator app like Google Authenticator, Authy, or 1Password to generate one-time codes.
                    </p>
                    <Button onClick={handleEnable2FA} size="sm" className="gap-2">
                      <Key className="w-3.5 h-3.5" />
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-6 items-start">
                    <div className="p-3 bg-white rounded-xl">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-32 h-32" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Scan QR Code</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Open your authenticator app and scan this QR code. Then enter the 6-digit code below to confirm.
                      </p>
                      <div className="p-2 bg-muted/40 rounded-lg border border-border/40">
                        <p className="text-[10px] text-muted-foreground">Or enter the secret key manually in your app</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Verification Code</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="font-mono text-center text-lg tracking-widest"
                      />
                      <Button onClick={handleVerify2FA} disabled={verifying || verificationCode.length !== 6}>
                        {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-success/15 text-success flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">2FA is Active</p>
                  <p className="text-xs text-muted-foreground mb-4">Your account is protected with two-factor authentication.</p>
                  <Button variant="outline" size="sm" onClick={handleDisable2FA} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    Disable 2FA
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="card-glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/40 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div>
              <Label>New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn("flex-1 h-1 rounded-full transition-all",
                      newPassword.length >= i * 4 ? (newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword) ? "bg-success" : "bg-warning") : "bg-muted"
                    )} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                className="mt-1.5"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Passwords don't match
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={changingPassword || !newPassword || newPassword !== confirmPassword}>
              {changingPassword ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
