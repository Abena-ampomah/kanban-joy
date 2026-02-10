import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, User } from "lucide-react";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"manager" | "individual">("individual");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName, role },
          },
        });
        if (error) throw error;
        toast({ title: "Check your email!", description: "We sent you a confirmation link." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-header items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <LayoutDashboard className="h-12 w-12 text-primary-foreground" />
            <h1 className="text-4xl font-display font-bold text-primary-foreground">TaskFlow</h1>
          </div>
          <p className="text-lg text-primary-foreground/80">
            The intelligent kanban board with AI-powered task management. Organize, collaborate, and ship faster.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-display font-bold text-foreground">TaskFlow</h1>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {isSignUp ? "Start managing tasks smarter" : "Sign in to your dashboard"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required className="mt-1" />
                </div>
                <div>
                  <Label>Role</Label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setRole("manager")}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        role === "manager" ? "border-primary bg-accent" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">Manager</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("individual")}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        role === "individual" ? "border-primary bg-accent" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <User className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">Individual</span>
                    </button>
                  </div>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
