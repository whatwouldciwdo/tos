import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "../components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login");
  }

  if (!user.isSuperAdmin) {
    redirect("/tor");
  }

  return (
    <div className="min-h-screen flex bg-[#262626] text-white">
      <Sidebar
        userName={user.name || "Super Admin"}
        userEmail={user.email || ""}
        userUsername={user.username || ""}
        userPosition={user.position?.name || "Super Admin"}
        userBidang={user.position?.bidang?.name || "-"}
        isSuperAdmin={true}
        canCreate={true}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
