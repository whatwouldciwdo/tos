import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const AUTH_COOKIE_NAME = "auth-token"; // Match with login route

type CustomJwtPayload = {
  sub: number;
  email: string;
  name: string;
  positionId: number;
  isSuperAdmin: boolean;
};

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new Error("Tidak ada token, user belum login");
  }

  let decoded: CustomJwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as unknown as CustomJwtPayload;
  } catch (e) {
    throw new Error("Token tidak valid");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: {
      position: {
        include: {
          bidang: true,
          positionRoles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  const hasSuperAdminRole = user.position?.positionRoles?.some(
    (pr) => pr.role?.name === "SUPER_ADMIN"
  );

  return {
    ...user,
    isSuperAdmin: Boolean(user.isSuperAdmin || hasSuperAdminRole),
  };
}
