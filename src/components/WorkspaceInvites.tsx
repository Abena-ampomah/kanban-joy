import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Mail } from "lucide-react";

export default function WorkspaceInvites() {
  const { pendingInvites, respondInvite, workspaces } = useWorkspace();

  if (pendingInvites.length === 0 && workspaces.length > 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pending invites</p>
          <p className="text-sm mt-1">You're already part of a workspace.</p>
        </div>
      </div>
    );
  }

  if (pendingInvites.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pending invites</p>
          <p className="text-sm mt-1">Ask a manager to invite you to their workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-2xl font-display font-bold text-foreground mb-4">Workspace Invitations</h2>
      <div className="space-y-3">
        {pendingInvites.map((inv) => (
          <Card key={inv.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">{inv.workspace?.name || "Workspace"}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">You've been invited to join this workspace.</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondInvite.mutate({ inviteId: inv.id, accept: false, workspaceId: inv.workspace_id })}
                  className="gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => respondInvite.mutate({ inviteId: inv.id, accept: true, workspaceId: inv.workspace_id })}
                  className="gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
