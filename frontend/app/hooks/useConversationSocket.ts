"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getApiUrl } from "@/utils/api";

export interface WSEvent {
  type: string;
  conversation_id: string;
  [key: string]: any;
}

export function useConversationSocket(tenantSlug: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!tenantSlug) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const base = (process.env.NEXT_PUBLIC_WS_URL || getApiUrl())
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    const ws = new WebSocket(`${base}/api/chat/ws/${tenantSlug}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      // Reconnect after 3s with exponential backoff could be better, but 3s is fine for now
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close();
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WSEvent;
        setLastEvent(data);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };
  }, [tenantSlug]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  const sendHumanReply = useCallback((conversationId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "human_reply", conversation_id: conversationId, content })
      );
    } else {
      console.warn("WebSocket not connected, cannot send reply");
    }
  }, []);

  return { connected, lastEvent, sendHumanReply };
}
