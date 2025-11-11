import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield, TrendingUp, Menu, X, ArrowRight, Globe, Zap, Lock, Users, Activity, Target } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const platforms = [
    { name: "MetaTrader 5", desc: "All-in-one platform for trading forex", icon: Activity },
    { name: "MetaTrader 4", desc: "Trade CFDs and Forex on MT4", icon: TrendingUp },
    { name: "cTrader", desc: "Speed and deep liquidity combined", icon: Zap },
    { name: "TradeLocker", desc: "Next-Generation Trading Platform", icon: Target },
  ];

  const features = [
    { name: "Web-Based Copier", desc: "Manage accounts, place trades, check performance", icon: Globe },
    { name: "Real-Time Signals", desc: "Copy trades instantly with our system", icon: BarChart3 },
    { name: "White-Label", desc: "Customize platform under your own brand", icon: Users },
    { name: "Secure Trading", desc: "Bank-level security & encryption", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                TradePro
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#platform" className="text-foreground/80 hover:text-primary transition-colors">Platform</a>
              <a href="#products" className="text-foreground/80 hover:text-primary transition-colors">Products</a>
              <a href="#features" className="text-foreground/80 hover:text-primary transition-colors">Features</a>
              <a href="#about" className="text-foreground/80 hover:text-primary transition-colors">About</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/auth")}>Login</Button>
              <Button onClick={() => navigate("/auth")} className="shadow-glow">
                Join Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-4 animate-fade-in">
              <a href="#platform" className="block text-foreground/80 hover:text-primary transition-colors">Platform</a>
              <a href="#products" className="block text-foreground/80 hover:text-primary transition-colors">Products</a>
              <a href="#features" className="block text-foreground/80 hover:text-primary transition-colors">Features</a>
              <a href="#about" className="block text-foreground/80 hover:text-primary transition-colors">About</a>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">Login</Button>
                <Button onClick={() => navigate("/auth")} className="w-full shadow-glow">Join Now</Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-32 pb-20 px-4">
        <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4 animate-fade-in">
              🚀 The Ultimate Solution For Investment Funds
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight animate-fade-in">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                TradePro
              </span>
              <br />
              <span className="text-foreground">Copy Trading Platform</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in delay-200">
              Discover our web-based copier for professional traders. Unlock your potential with real-time signals and advanced MT5 integration.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in delay-300">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="shadow-glow text-lg px-8 group"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground mt-1">Uptime</div>
              </div>
              <div className="text-center border-x border-border/50">
                <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground mt-1">Active Traders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">$2B+</div>
                <div className="text-sm text-muted-foreground mt-1">Volume Traded</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Section */}
      <div id="platform" className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Supported <span className="text-primary">Platforms</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Connect with industry-leading trading platforms
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platforms.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <div
                  key={index}
                  className="group bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-glow transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{platform.name}</h3>
                  <p className="text-muted-foreground text-sm">{platform.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products/Features Section */}
      <div id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful <span className="text-primary">Features</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to succeed in copy trading
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="relative group bg-gradient-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.name}</h3>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Start <span className="text-primary">Copy Trading?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Join thousands of traders who trust TradePro for their copy trading needs
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="shadow-glow text-lg px-8"
            >
              Get Started Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">TradePro</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Professional copy trading platform for modern traders
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">MetaTrader 5</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">MetaTrader 4</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">cTrader</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">APIs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Web Copier</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Signals</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">White-Label</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">CManager</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 TradePro. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Shield className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Activity className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
