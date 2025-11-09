import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Shield, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-6">
            <TrendingUp className="h-20 w-20 text-primary animate-pulse" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TradePro
          </h1>
          <p className="text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your Private Trading Command Center
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow text-lg px-8 py-6"
            >
              Access Dashboard
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-8 rounded-xl bg-gradient-card backdrop-blur-xl border border-border/50 hover:shadow-glow transition-all">
            <div className="p-4 rounded-lg bg-primary/10 w-fit mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Real-Time Analytics</h3>
            <p className="text-muted-foreground">
              Live market data and advanced charting with TradingView integration
            </p>
          </div>

          <div className="p-8 rounded-xl bg-gradient-card backdrop-blur-xl border border-border/50 hover:shadow-glow transition-all">
            <div className="p-4 rounded-lg bg-success/10 w-fit mb-4">
              <Shield className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Secure & Private</h3>
            <p className="text-muted-foreground">
              Bank-level security with encrypted authentication and private access
            </p>
          </div>

          <div className="p-8 rounded-xl bg-gradient-card backdrop-blur-xl border border-border/50 hover:shadow-glow transition-all">
            <div className="p-4 rounded-lg bg-accent/10 w-fit mb-4">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">MT5 Integration</h3>
            <p className="text-muted-foreground">
              Direct connection to MetaTrader 5 for seamless trade execution
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
