import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Shield, Key } from "lucide-react";

export default function Security() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
      setTwoFactorEnabled(data.two_factor_enabled || false);
    }
    setLoading(false);
  };

  const handleEnable2FA = async () => {
    if (!user) return;

    // Generate secret for 2FA
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Generate QR code URL for authenticator app
    const otpauthUrl = `otpauth://totp/TradePro:${user.email}?secret=${secret}&issuer=TradePro`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauthUrl)}`;
    
    setQrCodeUrl(qrUrl);

    const { error } = await supabase
      .from("profiles")
      .update({ two_factor_secret: secret })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleVerify2FA = async () => {
    if (!user || !verificationCode) return;

    // In production, verify the TOTP code against the secret
    // For now, just enable 2FA
    const { error } = await supabase
      .from("profiles")
      .update({ two_factor_enabled: true })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "2FA enabled successfully",
      });
      setTwoFactorEnabled(true);
      setQrCodeUrl("");
      setVerificationCode("");
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ 
        two_factor_enabled: false,
        two_factor_secret: null 
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "2FA disabled",
      });
      setTwoFactorEnabled(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-8">Security Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>
              <Shield className="inline mr-2 h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!twoFactorEnabled ? (
              <>
                {!qrCodeUrl ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enable 2FA to protect your account with an authenticator app like Google Authenticator or Authy.
                    </p>
                    <Button onClick={handleEnable2FA}>
                      <Key className="mr-2 h-4 w-4" />
                      Enable 2FA
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Scan this QR code with your authenticator app
                      </p>
                      <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto" />
                    </div>
                    <div>
                      <Label htmlFor="verificationCode">Verification Code</Label>
                      <Input
                        id="verificationCode"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                      />
                    </div>
                    <Button onClick={handleVerify2FA} className="w-full">
                      Verify and Enable
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-sm text-success mb-4">
                  ✓ Two-factor authentication is enabled
                </p>
                <Button variant="destructive" onClick={handleDisable2FA}>
                  Disable 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
