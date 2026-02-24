import { LayoutDashboard, LogOut, User, Shield, Building2, Users, Mail, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedWorkspaceId: string | null;
  onWorkspaceChange: (id: string | null) => void;
}

export default function AppSidebar({ activeTab, onTabChange, selectedWorkspaceId, onWorkspaceChange }: AppSidebarProps) {
  const { displayName, role, signOut } = useAuth();
  const { workspaces, pendingInvites } = useWorkspace();

  const handleWorkspaceSelect = (id: string | null) => {
    onWorkspaceChange(id);
    onTabChange("kanban");
  };

  return (
    <aside className="hidden md:flex w-64 flex-col gradient-sidebar text-sidebar-foreground">
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="h-7 w-7" />
          <h1 className="text-xl font-display font-bold">TaskFlow</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 overflow-y-auto space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Main</p>
          <div className="space-y-1">
            <button
              onClick={() => handleWorkspaceSelect(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === "kanban" && selectedWorkspaceId === null ? "bg-sidebar-accent/30 text-white" : "hover:bg-sidebar-accent/20"
                }`}
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">My Tasks</span>
            </button>
            <button
              onClick={() => onTabChange("archive")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === "archive" ? "bg-sidebar-accent/30 text-white" : "hover:bg-sidebar-accent/20"
                }`}
            >
              <Archive className="h-4 w-4" />
              <span className="text-sm font-medium">Archive</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Workspaces</p>
            {role === "manager" && (
              <button onClick={() => onTabChange("workspace")} title="Manage Workspaces">
                <Building2 className="h-3 w-3 opacity-50 hover:opacity-100" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceSelect(ws.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === "kanban" && selectedWorkspaceId === ws.id ? "bg-sidebar-accent/30 text-white" : "hover:bg-sidebar-accent/20"
                  }`}
              >
                <Building2 className="h-4 w-4 text-primary-foreground/70" />
                <span className="text-sm font-medium truncate">{ws.name}</span>
              </button>
            ))}

            {role !== "manager" && (
              <button
                onClick={() => onTabChange("invites")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === "invites" ? "bg-sidebar-accent/30 text-white" : "hover:bg-sidebar-accent/20"
                  }`}
              >
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">Invites {pendingInvites.length > 0 && `(${pendingInvites.length})`}</span>
              </button>
            )}
          </div>
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
          <button onClick={signOut} className="p-1.5 rounded-md hover:bg-sidebar-accent/30 transition-colors" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
