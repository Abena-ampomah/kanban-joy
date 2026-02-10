import { LayoutDashboard, LogOut, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AppSidebar() {
  const { displayName, role, signOut } = useAuth();

  return (
    <aside className="hidden md:flex w-64 flex-col gradient-sidebar text-sidebar-foreground">
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="h-7 w-7" />
          <h1 className="text-xl font-display font-bold">TaskFlow</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/30">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Kanban Board</span>
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-accent/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent/40 flex items-center justify-center text-sm font-bold">
            {displayName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <div className="flex items-center gap-1 text-xs opacity-70">
              {role === "manager" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
              <span className="capitalize">{role}</span>
            </div>
          </div>
          <button onClick={signOut} className="p-1.5 rounded-md hover:bg-sidebar-accent/30 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
