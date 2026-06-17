"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export interface CollaboratorInfo {
  clientId: number;
  name: string;
  color: string;
  activeTab?: string;
}

interface UseCollaborationReturn {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connected: boolean;
  collaborators: CollaboratorInfo[];
  updatePresence: (data: { activeTab?: string; activeField?: string }) => void;
  userColor: string;
}

// Palet warna untuk tiap sesi kolaborasi
const USER_COLORS = [
  "#E11D48",
  "#7C3AED",
  "#0EA5E9",
  "#059669",
  "#D97706",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

function getSessionColor(): string {
  // Gunakan warna konsisten selama satu sesi browser
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("collab-color");
    if (stored) return stored;
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    sessionStorage.setItem("collab-color", color);
    return color;
  }
  return USER_COLORS[0];
}

export function useCollaboration(
  torId: number | undefined,
  userName: string
): UseCollaborationReturn {
  // Y.Doc dibuat sekali per torId menggunakan useState lazy init
  const [ydoc] = useState<Y.Doc | null>(() => {
    if (!torId) return null;
    return new Y.Doc();
  });

  const providerRef = useRef<WebsocketProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const userColor = useMemo(() => getSessionColor(), []);

  useEffect(() => {
    if (!torId || !ydoc) return;

    // URL WebSocket server — bisa dikonfigurasi via env
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      `ws://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:3001`;

    const provider = new WebsocketProvider(wsUrl, `tor-${torId}`, ydoc, {
      connect: true,
    });

    providerRef.current = provider;

    // Set state awareness awal (nama & warna pengguna)
    provider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
    });

    // Listener status koneksi
    const handleStatus = (event: { status: string }) => {
      setConnected(event.status === "connected");
    };
    provider.on("status", handleStatus);

    // Listener perubahan awareness (siapa saja yang online)
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const myId = provider.awareness.clientID;
      const list: CollaboratorInfo[] = [];

      states.forEach((state, clientId) => {
        if (clientId !== myId && state.user) {
          list.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
            activeTab: state.activeTab,
          });
        }
      });

      setCollaborators(list);
    };

    provider.awareness.on("change", handleAwarenessChange);

    return () => {
      provider.awareness.off("change", handleAwarenessChange);
      provider.off("status", handleStatus);
      provider.destroy();
      providerRef.current = null;
      setConnected(false);
      setCollaborators([]);
    };
  }, [torId, ydoc, userName, userColor]);

  // Update awareness (tab aktif, field aktif, dsb.)
  const updatePresence = useCallback(
    (data: { activeTab?: string; activeField?: string }) => {
      if (!providerRef.current) return;
      const current = providerRef.current.awareness.getLocalState() || {};
      providerRef.current.awareness.setLocalState({ ...current, ...data });
    },
    []
  );

  return {
    ydoc,
    provider: providerRef.current,
    connected,
    collaborators,
    updatePresence,
    userColor,
  };
}
