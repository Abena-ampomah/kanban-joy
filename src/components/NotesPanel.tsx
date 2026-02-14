import { useState } from "react";
import { useNotes, Note } from "@/hooks/useNotes";
import { useTasks } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote, Plus, Trash2, ChevronLeft, Mic, MicOff, Sparkles, Loader2, Link2, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MeetingTranscriber from "./MeetingTranscriber";

export default function NotesPanel() {
  const { notes, isLoading, createNote, updateNote, deleteNote } = useNotes();
  const { tasks } = useTasks();
  const { toast } = useToast();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showTranscriber, setShowTranscriber] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const handleCreate = async (isMeeting = false) => {
    const result = await createNote.mutateAsync({
      title: isMeeting ? "Meeting Notes" : "New Note",
      is_meeting_note: isMeeting,
    });
    setSelectedNote(result);
    if (isMeeting) setShowTranscriber(true);
  };

  const handleSummarize = async () => {
    if (!selectedNote?.content?.trim()) {
      toast({ title: "Nothing to summarize", variant: "destructive" });
      return;
    }
    setSummarizing(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: selectedNote.content }),
      });
      if (!resp.ok) throw new Error("Failed");
      const { summary } = await resp.json();
      const newContent = selectedNote.content + "\n\n---\n\n## AI Summary\n\n" + summary;
      updateNote.mutate({ id: selectedNote.id, content: newContent });
      setSelectedNote({ ...selectedNote, content: newContent });
      toast({ title: "Summary generated!" });
    } catch {
      toast({ title: "Summarization failed", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const handleTranscriptAppend = (text: string) => {
    if (!selectedNote) return;
    const newContent = (selectedNote.content || "") + text;
    updateNote.mutate({ id: selectedNote.id, content: newContent });
    setSelectedNote({ ...selectedNote, content: newContent });
  };

  // Note detail view
  if (selectedNote) {
    const linkedTask = tasks.find((t) => t.id === selectedNote.task_id);
    return (
      <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <button onClick={() => { setSelectedNote(null); setShowTranscriber(false); }} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Input
            value={selectedNote.title}
            onChange={(e) => {
              const title = e.target.value;
              setSelectedNote({ ...selectedNote, title });
              updateNote.mutate({ id: selectedNote.id, title });
            }}
            className="font-semibold border-none shadow-none px-0 h-auto text-sm focus-visible:ring-0"
          />
          <div className="flex gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSummarize} disabled={summarizing}>
              {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { deleteNote.mutate(selectedNote.id); setSelectedNote(null); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Task link */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={selectedNote.task_id || "none"}
            onValueChange={(v) => {
              const taskId = v === "none" ? null : v;
              setSelectedNote({ ...selectedNote, task_id: taskId });
              updateNote.mutate({ id: selectedNote.id, task_id: taskId });
            }}
          >
            <SelectTrigger className="h-7 text-xs border-none shadow-none px-1">
              <SelectValue placeholder="Link to task..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No task</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transcriber */}
        {selectedNote.is_meeting_note && (
          <div className="px-4 py-2 border-b border-border">
            <MeetingTranscriber
              onTranscript={handleTranscriptAppend}
              isActive={showTranscriber}
              onToggle={() => setShowTranscriber(!showTranscriber)}
            />
          </div>
        )}

        {/* Content */}
        <Textarea
          value={selectedNote.content || ""}
          onChange={(e) => {
            const content = e.target.value;
            setSelectedNote({ ...selectedNote, content });
            updateNote.mutate({ id: selectedNote.id, content });
          }}
          placeholder={selectedNote.is_meeting_note ? "Transcription will appear here..." : "Write your note..."}
          className="flex-1 border-none rounded-none resize-none text-sm focus-visible:ring-0"
        />
      </div>
    );
  }

  // Notes list view
  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-sm">Notes</h3>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleCreate(false)}>
              <Plus className="h-3 w-3" /> Note
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleCreate(true)}>
              <Mic className="h-3 w-3" /> Meeting
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
            <StickyNote className="h-8 w-8 opacity-30" />
            <p>No notes yet</p>
            <p className="text-xs">Create a note or start a meeting</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {notes.map((note) => {
              const linkedTask = tasks.find((t) => t.id === note.task_id);
              return (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {note.is_meeting_note && <Mic className="h-3 w-3 text-primary flex-shrink-0" />}
                    <span className="text-sm font-medium truncate">{note.title}</span>
                  </div>
                  {note.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                    {linkedTask && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{linkedTask.title}</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
