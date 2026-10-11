"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminClassesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/branches");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
      Đang chuyển hướng đến trang Cơ Sở & Lớp Học...
    </div>
  );
}
