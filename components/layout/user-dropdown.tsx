"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, Users } from "lucide-react";
import Popover from "@/components/shared/popover";
import Image from "next/image";
import { Session } from "next-auth";
import Link from "next/link";
import { User } from "@prisma/client";

export default function UserDropdown({ session }: { session: Session }) {
  const { email, image } = session?.user || {};
  const [openPopover, setOpenPopover] = useState(false);
  if (!email) return null;

  return (
    <div className="relative inline-block text-left">
      <Popover
        content={
          <div className="w-full rounded-md bg-primary dark:bg-gray-900 p-2 sm:w-56">
            <div className="p-2">
              {session?.user?.name && (
                <p className="truncate font-medium text-sm">
                  {session?.user?.name}
                </p>
              )}
              <p className="truncate text-sm">
                {session?.user?.email}
              </p>
            </div>
            {(session?.user as User).role === "admin" && (
              <>
                <Link
                  href="/dashboard"
                  className="hover:bg-primary-hover relative flex w-full items-center justify-start space-x-2 rounded-md p-2 text-left text-sm transition-all duration-75"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <p className="text-sm">Dashboard</p>
                </Link>

                <Link
                  href="/admin"
                  className="hover:bg-primary-hover relative flex w-full items-center justify-start space-x-2 rounded-md p-2 text-left text-sm transition-all duration-75"
                >
                  <Users className="h-4 w-4" />
                  <p className="text-sm">Admin Dashboard</p>
                </Link>
              </>
            )}
            <button
              className="hover:bg-primary-hover relative flex w-full items-center justify-start space-x-2 rounded-md p-2 text-left text-sm transition-all duration-75"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              <p className="text-sm">Logout</p>
            </button>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-300 transition-all duration-75 focus:outline-none active:scale-95 sm:h-9 sm:w-9"
        >
          <Image
            alt={email}
            src={image || `https://avatars.dicebear.com/api/micah/${email}.svg`}
            width={40}
            height={40}
          />
        </button>
      </Popover>
    </div>
  );
}
