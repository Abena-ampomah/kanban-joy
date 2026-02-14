import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onTranscript: (text: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export default function MeetingTranscriber({ onTranscript, isActive, onToggle }: Props) {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setConnecting(true);
    try {
      // Get mic permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Get scribe token
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!resp.ok) throw new Error("Failed to get token");
      const { token } = await resp.json();

      // Connect WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/websocket?model_id=scribe_v2_realtime&language_code=en&token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setRecording(true);
        setConnecting(false);

        // Start MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const buffer = await e.data.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };

        mediaRecorder.start(250); // 250ms chunks
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "committed_transcript" && data.text?.trim()) {
            onTranscript(data.text + " ");
          }
        } catch {}
      };

      ws.onerror = () => {
        toast({ title: "Transcription error", variant: "destructive" });
        stopRecording();
      };

      ws.onclose = () => {
        setRecording(false);
      };
    } catch (e: any) {
      toast({ title: "Could not start recording", description: e.message, variant: "destructive" });
      setConnecting(false);
    }
  }, [onTranscript, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setConnecting(false);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={recording ? "destructive" : "outline"}
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={recording ? stopRecording : startRecording}
        disabled={connecting}
      >
        {connecting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : recording ? (
          <MicOff className="h-3 w-3" />
        ) : (
          <Mic className="h-3 w-3" />
        )}
        {connecting ? "Connecting..." : recording ? "Stop Recording" : "Start Recording"}
      </Button>
      {recording && (
        <span className="flex items-center gap-1 text-[10px] text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          Live
        </span>
      )}
    </div>
  );
}
