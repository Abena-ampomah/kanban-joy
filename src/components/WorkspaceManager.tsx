import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Users, Trash2, Building2 } from "lucide-react";

export default function WorkspaceManager() {
  const { activeWorkspace, members, invites, createWorkspace, sendInvite, removeMember } = useWorkspace();
  const { user } = useAuth();
  const [wsName, setWsName] = useState("");
  const [email, setEmail] = useState("");

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="font-display">Create a Workspace</CardTitle>
            <p className="text-sm text-muted-foreground">Set up a workspace to collaborate with your team.</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (wsName.trim()) createWorkspace.mutate(wsName.trim());
                setWsName("");
              }}
              className="space-y-4"
            >
              <div>
                <Label>Workspace Name</Label>
                <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="My Team" className="mt-1" required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={createWorkspace.isPending}>
                <Plus className="h-4 w-4" /> Create Workspace
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending" && i.workspace_id === activeWorkspace.id);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">{activeWorkspace.name}</h2>
        <p className="text-sm text-muted-foreground">Manage your workspace members and invitations.</p>
      </div>

      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Send className="h-4 w-4" /> Invite Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) sendInvite.mutate({ workspaceId: activeWorkspace.id, email: email.trim() });
              setEmail("");
            }}
            className="flex gap-2"
          >
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@email.com" type="email" required className="flex-1" />
            <Button type="submit" disabled={sendInvite.isPending} className="gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {m.profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.profile?.display_name || "Unknown"}</p>
                  <Badge variant={m.role === "manager" ? "default" : "secondary"} className="text-[10px]">
                    {m.role}
                  </Badge>
                </div>
              </div>
              {m.user_id !== user?.id && m.role !== "manager" && (
                <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="text-sm">{inv.email}</span>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
