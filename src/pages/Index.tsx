import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Auth from "./Auth";
import AppSidebar from "@/components/AppSidebar";
import KanbanBoard from "@/components/KanbanBoard";
import AIChatbot from "@/components/AIChatbot";
import NotesPanel from "@/components/NotesPanel";
import WorkspaceManager from "@/components/WorkspaceManager";
import WorkspaceInvites from "@/components/WorkspaceInvites";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, StickyNote } from "lucide-react";

export default function Index() {
  const { user, loading, role } = useAuth();
  const [activeTab, setActiveTab] = useState("kanban");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Auth />;

  const renderContent = () => {
    if (activeTab === "workspace" && role === "manager") {
      return <WorkspaceManager />;
    }
    if (activeTab === "invites" && role !== "manager") {
      return <WorkspaceInvites />;
    }
    return (
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Kanban Board
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="kanban" className="flex-1 overflow-hidden mt-0">
          <KanbanBoard />
        </TabsContent>
        <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
          <NotesPanel />
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
      <AIChatbot />
    </div>
  );
}
