import { Task } from "@/hooks/useTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Trash2, CalendarDays, Archive, Trash } from "lucide-react";
import { format } from "date-fns";

interface ArchivePanelProps {
    tasks: Task[];
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    isLoading?: boolean;
}

export default function ArchivePanel({ tasks, onRestore, onDelete, isLoading }: ArchivePanelProps) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-12">
                <RefreshCcw className="h-6 w-6 animate-spin mr-2" />
                Loading archive...
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Archive className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-lg font-medium text-foreground/60">Your archive is empty</p>
                <p className="text-sm max-w-xs text-center mt-1">Deleted tasks appear here for 6 months before being permanently removed.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <Archive className="h-6 w-6 text-primary" />
                            Archived Tasks
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Items in the archive are permanently deleted after 6 months.
                        </p>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1">
                        {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
                    </Badge>
                </div>

                <div className="grid gap-3">
                    {tasks.map((task) => (
                        <Card key={task.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] uppercase tracking-wider font-bold h-5"
                                            style={{
                                                borderColor: task.priority?.color || 'transparent',
                                                color: task.priority?.color
                                            }}
                                        >
                                            {task.priority?.name || 'No Priority'}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                            <CalendarDays className="h-3 w-3" />
                                            Archived: {task.archived_at ? format(new Date(task.archived_at), 'MMM d, yyyy') : 'Unknown'}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-sm truncate text-foreground">{task.title}</h4>
                                    {task.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRestore(task.id)}
                                        className="h-8 gap-1.5 text-xs font-medium hover:text-primary hover:bg-primary/5"
                                    >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                        Restore
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(task.id)}
                                        className="h-8 w-8 text-destructive hover:bg-destructive/5"
                                        title="Permanently delete"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
