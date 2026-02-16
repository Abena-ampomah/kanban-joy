import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { display_name: string } | null;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  invited_by: string;
  status: string;
  created_at: string;
  workspace?: { name: string } | null;
}

export function useWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Workspace[];
    },
    enabled: !!user,
  });

  const membersQuery = useQuery({
    queryKey: ["workspace-members", workspacesQuery.data?.[0]?.id],
    queryFn: async () => {
      const wsId = workspacesQuery.data?.[0]?.id;
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*, profile:profiles(display_name)")
        .eq("workspace_id", wsId);
      if (error) throw error;
      return (data ?? []) as unknown as WorkspaceMember[];
    },
    enabled: !!user && !!workspacesQuery.data?.[0]?.id,
  });

  const invitesQuery = useQuery({
    queryKey: ["workspace-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*, workspace:workspaces(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkspaceInvite[];
    },
    enabled: !!user,
  });

  const createWorkspace = useMutation({
    mutationFn: async (name: string) => {
      // Create workspace
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .insert({ name, created_by: user!.id })
        .select()
        .single();
      if (wsErr) throw wsErr;
      // Add creator as manager member
      const { error: memErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: ws.id, user_id: user!.id, role: "manager" });
      if (memErr) throw memErr;
      return ws;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      toast({ title: "Workspace created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendInvite = useMutation({
    mutationFn: async ({ workspaceId, email }: { workspaceId: string; email: string }) => {
      const { error } = await supabase
        .from("workspace_invites")
        .insert({ workspace_id: workspaceId, email, invited_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invites"] });
      toast({ title: "Invite sent!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondInvite = useMutation({
    mutationFn: async ({ inviteId, accept, workspaceId }: { inviteId: string; accept: boolean; workspaceId: string }) => {
      const { error: updErr } = await supabase
        .from("workspace_invites")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("id", inviteId);
      if (updErr) throw updErr;
      if (accept) {
        const { error: memErr } = await supabase
          .from("workspace_members")
          .insert({ workspace_id: workspaceId, user_id: user!.id, role: "member" });
        if (memErr) throw memErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invites"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      toast({ title: "Invite updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      toast({ title: "Member removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activeWorkspace = workspacesQuery.data?.[0] ?? null;
  const pendingInvites = (invitesQuery.data ?? []).filter((i) => i.status === "pending");

  return {
    workspaces: workspacesQuery.data ?? [],
    activeWorkspace,
    members: membersQuery.data ?? [],
    invites: invitesQuery.data ?? [],
    pendingInvites,
    isLoading: workspacesQuery.isLoading,
    createWorkspace,
    sendInvite,
    respondInvite,
    removeMember,
  };
}
