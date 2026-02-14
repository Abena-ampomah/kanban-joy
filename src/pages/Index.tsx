import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Auth from "./Auth";
import AppSidebar from "@/components/AppSidebar";
import KanbanBoard from "@/components/KanbanBoard";
import AIChatbot from "@/components/AIChatbot";
import NotesPanel from "@/components/NotesPanel";

export default function Index() {
  const { user, loading } = useAuth();
  const [showNotes, setShowNotes] = useState(true);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <KanbanBoard />
      {showNotes && <NotesPanel />}
      <AIChatbot />
    </div>
  );
}
