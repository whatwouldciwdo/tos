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
        className={`fixed left-0 top-0 h-screen w-24 bg-[#1f1f1f] border-r border-[#42ff6b] flex-shrink-0 z-50 transition-transform duration-300 ease-in-out ${
          isMinimized ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Arrow Toggle Button (Minimize / Expand) on the right border */}
        <button
          type="button"
          onClick={toggleMinimize}
          title={isMinimized ? "Buka Side Navbar" : "Minimize Side Navbar"}
          aria-label={isMinimized ? "Buka Side Navbar" : "Minimize Side Navbar"}
          className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-14 bg-[#1f1f1f] border border-l-0 border-[#42ff6b] rounded-r-xl flex items-center justify-center text-[#42ff6b] hover:bg-[#42ff6b] hover:text-black transition-all duration-200 shadow-lg cursor-pointer z-50"
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
            <div className="w-14 h-14">
              <Image
                src="/pln-tos-logo.jpg"
                alt="TOS Logo"
                width={56}
                height={56}
                className="object-contain"
              />
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              {pathname === "/tor" ? (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-12 h-12 rounded-full bg-[#42ff6b] flex items-center justify-center text-black font-semibold text-base hover:bg-[#38e05c] hover:scale-110 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[#42ff6b]/50"
                  title="Profile Settings"
                >
                  {initials}
                </button>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#42ff6b] flex items-center justify-center text-black font-semibold text-base">
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
                    className={`flex flex-col items-center gap-1.5 text-xs transition-all duration-300 group cursor-pointer ${
                      item.active
                        ? "text-[#42ff6b]"
                        : "text-white hover:text-[#42ff6b] hover:-translate-y-0.5"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        item.active
                          ? "border-2 border-[#42ff6b] bg-[#42ff6b]/15 shadow-lg shadow-[#42ff6b]/50"
                          : "border-2 border-[#42ff6b] group-hover:bg-[#42ff6b]/20 group-hover:shadow-lg group-hover:shadow-[#42ff6b]/50 group-hover:scale-110"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="group-hover:font-semibold transition-all duration-300">
                      {item.label}
                    </span>
                  </button>
                )
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-col items-center gap-1.5 text-xs text-white hover:text-red-400 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full border-2 border-[#42ff6b] group-hover:border-red-400 group-hover:bg-red-500/20 group-hover:shadow-lg group-hover:shadow-red-400/50 group-hover:scale-110 flex items-center justify-center transition-all duration-300">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="group-hover:font-semibold transition-all duration-300">
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
