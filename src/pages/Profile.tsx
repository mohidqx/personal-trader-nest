import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { UserCircle, Camera, Edit2, Save, X, BadgeCheck, Phone, MapPin, Calendar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscores only"),
  phone: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

export default function Profile() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [form, setForm] = useState({ full_name: "", username: "", phone: "", country: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); }
    });
  }, []);

  const loadProfile = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data);
      setForm({
        full_name: profileRes.data.full_name || "",
        username: profileRes.data.username || "",
        phone: profileRes.data.phone || "",
        country: profileRes.data.country || "",
      });
    }
    if (roleRes.data) setUserRole(roleRes.data.role);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const validated = profileSchema.parse(form);
      const { error } = await supabase.from("profiles").update(validated).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      setIsEditing(false);
      await loadProfile(user.id);
    } catch (err) {
      if (err instanceof z.ZodError) toast({ title: "Validation Error", description: err.errors[0].message, variant: "destructive" });
      else toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <AppLayout title="Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Profile" subtitle="Manage your personal information">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Avatar Card */}
        <div className="card-glass rounded-xl p-6 flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
              {profile?.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {(profile?.full_name || profile?.username || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{profile?.full_name || "Unknown User"}</h2>
              {userRole === "admin" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 font-medium">
                  Admin
                </span>
              )}
              {userRole === "user" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                  Trader
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); loadProfile(user?.id); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave}>
          <div className="card-glass rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border/40">
              <h3 className="font-semibold text-sm">Personal Information</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
                  {isEditing ? (
                    <Input className="mt-1.5" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  ) : (
                    <p className="mt-1.5 text-sm font-medium">{profile?.full_name || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username</Label>
                  {isEditing ? (
                    <Input className="mt-1.5" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                  ) : (
                    <p className="mt-1.5 text-sm font-medium font-mono">@{profile?.username || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm">{user?.email || "—"}</p>
                    <BadgeCheck className="w-3.5 h-3.5 text-success" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                  {isEditing ? (
                    <Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm">{profile?.phone || "Not set"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Country</Label>
                  {isEditing ? (
                    <Input className="mt-1.5" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. United States" />
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm">{profile?.country || "Not set"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</p>
                  </div>
                </div>
              </div>

              {isEditing && (
                <Button type="submit" className="w-full gap-2" disabled={saving}>
                  {saving ? <><div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Saving...</> : <><Save className="w-3.5 h-3.5" />Save Changes</>}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Account Info */}
        <div className="card-glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/40">
            <h3 className="font-semibold text-sm">Account Details</h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "User ID", value: user?.id, mono: true },
              { label: "Auth Provider", value: profile?.oauth_provider || "Email" },
              { label: "Role", value: userRole.charAt(0).toUpperCase() + userRole.slice(1) },
              { label: "2FA Status", value: profile?.two_factor_enabled ? "Enabled ✓" : "Disabled", color: profile?.two_factor_enabled ? "text-success" : "text-muted-foreground" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn("text-xs font-medium", item.mono && "font-mono", item.color || "text-foreground")}>
                  {item.mono ? item.value?.slice(0, 12) + "..." : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
