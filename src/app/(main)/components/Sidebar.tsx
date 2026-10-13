"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Search,
  LogOut,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ProfileModal from "@/components/ProfileModal";

type SidebarProps = {
  userName: string;
  userEmail?: string;
  userUsername?: string;
  userPosition?: string;
  userBidang?: string;
  isSuperAdmin: boolean;
  canCreate?: boolean;
};

export default function Sidebar({
  userName,
  userEmail = "",
  userUsername = "",
  userPosition = "",
  userBidang = "",
  isSuperAdmin,
  canCreate = true,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [profileData, setProfileData] = useState({
    name: userName,
    username: userUsername,
    email: userEmail,
    position: userPosition,
    bidang: userBidang,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tos-sidebar-minimized");
      if (saved === "true") {
        setIsMinimized(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tos-sidebar-minimized", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const initials = useMemo(
    () =>
      userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [userName]
  );

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } catch (e) {
      console.error(e);
    } finally {
      router.push("/login");
    }
  };

  const handleProfileUpdate = async (data: {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    const result = await response.json();

    // Update local profile data
    setProfileData({
      name: result.user.name,
      username: result.user.username,
      email: result.user.email,
      position: result.user.position?.name || "",
      bidang: result.user.position?.bidang?.name || "",
    });
  };

  const menuItems = [
    {
      id: "create",
      label: "create",
      icon: Plus,
      onClick: () => router.push("/tor/create"),
      show: canCreate,
      active: pathname === "/tor/create",
    },
    {
      id: "tors",
      label: "TORs",
      icon: FileText,
      onClick: () => router.push("/tor"),
      show: true,
      active: pathname?.startsWith("/tor") && pathname !== "/tor/create",
    },
    {
      id: "search",
      label: "search",
      icon: Search,
      onClick: () => {}, // TODO: Implement search modal
      show: true,
      active: false,
    },
    {
      id: "admin",
      label: "admin",
      icon: Shield,
      onClick: () => router.push("/admin"),
      show: isSuperAdmin,
      active: pathname?.startsWith("/admin"),
    },
  ];

  return (
    <>
      {/* Layout Spacer so main content adjusts smoothly when sidebar is minimized/expanded */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out ${
          isMinimized ? "w-0" : "w-24"
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed left-0 top-0 h-screen w-24 neu-sidebar flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${
          isMinimized ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Arrow Toggle Button (Minimize / Expand) on the right border */}
        <button
          type="button"
          onClick={toggleMinimize}
          title={isMinimized ? "Buka Side Navbar" : "Minimize Side Navbar"}
          aria-label={isMinimized ? "Buka Side Navbar" : "Minimize Side Navbar"}
          className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-14 neu-btn rounded-r-xl rounded-l-none border-l-0 flex items-center justify-center text-[#42ff6b] hover:text-[#42ff6b] transition-all duration-200 cursor-pointer z-50"
        >
          {isMinimized ? (
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>

        {/* Scrollable Inner Container */}
        <div className="w-full h-full flex flex-col items-center justify-between py-6 overflow-y-auto overflow-x-hidden">
          {/* Logo & Avatar */}
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="w-15 h-15 p-1.5 neu-inset-sm rounded-2xl flex items-center justify-center">
              <Image
                src="/pln-tos-logo.jpg"
                alt="TOS Logo"
                width={48}
                height={48}
                className="object-contain rounded-lg"
              />
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              {pathname === "/tor" ? (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-12 h-12 rounded-full neu-btn-accent flex items-center justify-center font-bold text-base cursor-pointer"
                  title="Profile Settings"
                >
                  {initials}
                </button>
              ) : (
                <div className="w-12 h-12 rounded-full neu-btn-accent flex items-center justify-center font-bold text-base">
                  {initials}
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col items-center gap-6 my-4">
            {menuItems.map(
              (item) =>
                item.show && (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`flex flex-col items-center gap-2 text-xs transition-all duration-300 group cursor-pointer ${
                      item.active
                        ? "text-[#42ff6b]"
                        : "text-gray-300 hover:text-[#42ff6b]"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        item.active
                          ? "neu-btn-active text-[#42ff6b]"
                          : "neu-btn text-gray-200 group-hover:text-[#42ff6b]"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium tracking-wide group-hover:text-[#42ff6b] transition-all duration-300">
                      {item.label}
                    </span>
                  </button>
                )
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-col items-center gap-2 text-xs text-gray-300 hover:text-red-400 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl neu-btn group-hover:!border-red-500/40 flex items-center justify-center transition-all duration-300 text-gray-200 group-hover:text-red-400">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium tracking-wide transition-all duration-300">
                logout
              </span>
            </button>
          </div>

          <div className="h-2" />
        </div>
      </aside>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userData={profileData}
        onUpdate={handleProfileUpdate}
      />
    </>
  );
}
