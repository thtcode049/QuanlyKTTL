import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AntdConfigProvider } from "@/components/providers/AntdConfigProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Quản Lý CLB Cờ Vua Kiện Tướng Tương Lai (KTTLL)",
  description: "Hệ thống quản lý CLB Cờ vua Kiện Tướng Tương Lai",
  openGraph: {
    title: "Quản Lý CLB Cờ Vua Kiện Tướng Tương Lai (KTTLL)",
    description: "Hệ thống quản lý CLB Cờ vua Kiện Tướng Tương Lai",
    url: "https://quanlikttl.vercel.app",
    siteName: "CLB Cờ Vua Kiện Tướng Tương Lai",
    locale: "vi_VN",
    type: "website",
  },
  icons: {
    icon: "https://kientuongtuonglai.com/wp-content/uploads/2024/08/cropped-favicon-1-192x192.webp",
    apple: "https://kientuongtuonglai.com/wp-content/uploads/2024/08/cropped-favicon-1-192x192.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#F8FAF9] text-slate-800 antialiased">
        <AntdRegistry>
          <AntdConfigProvider>{children}</AntdConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

