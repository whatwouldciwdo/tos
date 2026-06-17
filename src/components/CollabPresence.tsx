"use client";

import { CollaboratorInfo } from "@/hooks/useCollaboration";

interface CollabPresenceProps {
  collaborators: CollaboratorInfo[];
  connected: boolean;
  currentUserName: string;
  currentUserColor: string;
}

export default function CollabPresence({
  collaborators,
  connected,
  currentUserName,
  currentUserColor,
}: CollabPresenceProps) {
  const allUsers = [
    { clientId: -1, name: currentUserName, color: currentUserColor, isMe: true },
    ...collaborators.map((c) => ({ ...c, isMe: false })),
  ];

  return (
    <div className="flex items-center gap-3">
      {/* Status koneksi */}
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-yellow-400"
          }`}
        />
        <span className="text-xs text-gray-500">
          {connected ? "Terhubung" : "Menyambungkan..."}
        </span>
      </div>

      {/* Daftar avatar pengguna aktif */}
      <div className="flex items-center -space-x-2">
        {allUsers.map((user) => (
          <div
            key={user.clientId}
            className="relative group"
            title={user.isMe ? `${user.name} (Anda)` : user.name}
          >
            {/* Avatar lingkaran */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm cursor-default select-none"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {user.name}
                {user.isMe && (
                  <span className="text-gray-400 ml-1">(Anda)</span>
                )}
                {!user.isMe && (user as CollaboratorInfo).activeTab && (
                  <span className="text-gray-400 ml-1">
                    · {(user as CollaboratorInfo).activeTab}
                  </span>
                )}
              </div>
              {/* Arrow */}
              <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Teks jumlah pengguna jika lebih dari satu */}
      {collaborators.length > 0 && (
        <span className="text-xs text-blue-600 font-medium">
          {collaborators.length} pengguna lain sedang edit
        </span>
      )}
    </div>
  );
}
