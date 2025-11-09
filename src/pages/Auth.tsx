import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Lock, Mail } from "lucide-react";
import { z } from "zod";

// Security: Comprehensive input validation schema
const authSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid email format"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
});

// Security: Sanitize input to prevent XSS
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .slice(0, 255); // Enforce maximum length
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Security: Rate limiting check (simple client-side)
    if (attemptCount >= 5) {
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait a few minutes before trying again.",
      });
      return;
    }

    // Security: Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password.slice(0, 128); // Just limit length, don't modify

    // Security: Validate inputs
    const validation = authSchema.safeParse({
      email: sanitizedEmail,
      password: sanitizedPassword,
    });

    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setAttemptCount((prev) => prev + 1);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: sanitizedPassword,
        });

        if (error) {
          // Security: Generic error message to prevent user enumeration
          if (error.message.includes("Invalid") || error.message.includes("credentials")) {
            throw new Error("Invalid email or password");
          }
          throw error;
        }

        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your account.",
        });
        
        // Security: Reset attempt count on success
        setAttemptCount(0);
        navigate("/dashboard");
      } else {
        const redirectUrl = `${window.location.origin}/dashboard`;
        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          // Security: Handle specific errors without exposing system details
          if (error.message.includes("already registered")) {
            throw new Error("An account with this email already exists");
          }
          throw error;
        }

        toast({
          title: "Account created!",
          description: "You can now sign in to access your dashboard.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">TradePro</h1>
          <p className="text-muted-foreground">Private Trading Dashboard</p>
        </div>

        <Card className="p-8 bg-card/50 backdrop-blur-xl border-border/50 shadow-elevation">
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                autoComplete="email"
                className={`bg-secondary/50 border-border ${
                  errors.email ? "border-destructive" : ""
                }`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={128}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className={`bg-secondary/50 border-border ${
                  errors.password ? "border-destructive" : ""
                }`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
              {!isLogin && !errors.password && (
                <p className="text-xs text-muted-foreground">
                  Must contain uppercase, lowercase, and number. Min 8 characters.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
