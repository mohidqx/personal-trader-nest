import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { z } from "zod";
import { ArrowLeft, UserCircle, Edit, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100, "Name too long"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  phone: z.string().max(20, "Phone number too long").optional(),
  country: z.string().max(100, "Country name too long").optional(),
});

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [userRole, setUserRole] = useState<string>("user");
  const [isEditing, setIsEditing] = useState(false);
  const [showUserIdsDialog, setShowUserIdsDialog] = useState(false);
  const [allUserIds, setAllUserIds] = useState<Array<{ id: string; email: string; full_name: string; username: string }>>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
    } else {
      setProfile(data);
      setFullName(data?.full_name || "");
      setUsername((data as any)?.username || "");
      setPhone(data?.phone || "");
      setCountry(data?.country || "");
    }

    // Load user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (roleData) {
      setUserRole(roleData.role);
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validatedData = profileSchema.parse({
        full_name: fullName,
        username: username,
        phone: phone || undefined,
        country: country || undefined,
      });

      const { error } = await supabase
        .from("profiles")
        .update(validatedData)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setIsEditing(false);
      loadProfile(user.id);
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
          description: "Failed to update profile",
          variant: "destructive",
        });
      }
    }
  };

  const handleViewAllUserIds = async () => {
    if (userRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only admins can view all user IDs",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) throw usersError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, { full_name: p.full_name }]) || []);

      const usersList = usersData.users.map(u => ({
        id: u.id,
        email: u.email || "N/A",
        full_name: profilesMap.get(u.id)?.full_name || "N/A",
        username: "N/A",
      }));

      setAllUserIds(usersList);
      setShowUserIdsDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user IDs",
        variant: "destructive",
      });
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <UserCircle className="h-12 w-12 text-primary" />
              <div>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                />
                <p className="text-xs text-muted-foreground">Alphanumeric and underscores only</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </form>

            {userRole === "admin" && (
              <>
                <div className="border-t my-6" />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Admin Configuration</h3>
                  <Button variant="outline" className="w-full">
                    View All User IDs
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showUserIdsDialog} onOpenChange={setShowUserIdsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>All User IDs</DialogTitle>
            <DialogDescription>
              List of all registered users in the system
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-4">
              {allUserIds.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">User ID:</span>
                      <p className="text-muted-foreground font-mono text-xs break-all">{user.id}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Full Name:</span>
                      <p className="text-muted-foreground">{user.full_name}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Username:</span>
                      <p className="text-muted-foreground">{user.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
