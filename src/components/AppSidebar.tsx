import { LayoutDashboard, LogOut, User, Shield, Building2, Users, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { displayName, role, signOut } = useAuth();
  const { activeWorkspace, pendingInvites } = useWorkspace();

  const navItems = [
    { id: "kanban", label: "Kanban Board", icon: LayoutDashboard },
    ...(role === "manager"
      ? [{ id: "workspace", label: "Workspace", icon: Building2 }]
      : [{ id: "invites", label: `Invites${pendingInvites.length > 0 ? ` (${pendingInvites.length})` : ""}`, icon: Mail }]
    ),
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col gradient-sidebar text-sidebar-foreground">
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="h-7 w-7" />
          <h1 className="text-xl font-display font-bold">TaskFlow</h1>
        </div>
        {activeWorkspace && (
          <p className="text-xs mt-2 opacity-70 truncate">{activeWorkspace.name}</p>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === item.id ? "bg-sidebar-accent/30" : "hover:bg-sidebar-accent/20"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
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
