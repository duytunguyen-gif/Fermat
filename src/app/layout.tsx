import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fermat Tech — Quản lý công việc",
    template: "%s · Fermat Tech",
  },
  description:
    "Ứng dụng quản lý công việc nội bộ của Fermat Tech: giao việc, theo dõi tiến độ, duyệt hoàn thành và báo cáo.",
  applicationName: "Fermat Tech",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fermat Tech",
  },
  // Icon (favicon, icon.png, apple-icon.png) được Next tự nhận từ src/app/ theo
  // quy ước file — không khai báo thủ công để tránh link trùng/hỏng.
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
