import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser } from "@/lib/server/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ROOMIE — Nền tảng ghép bạn cùng phòng thông minh",
  description:
    "Tìm kiếm và kết nối bạn cùng phòng lý tưởng dựa trên lối sống, thói quen sinh hoạt và chỉ số tương thích đa chiều.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        <Navbar currentUser={currentUser} />
        <main className="flex-1 pb-16 md:pb-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-blue-600">roomie.</span>
              <span>— Nền tảng ghép đôi bạn cùng phòng tương thích</span>
            </div>
            <div className="text-slate-400">
              © {new Date().getFullYear()} ROOMIE Platform. Đồ án mẫu thử nghiệm thực tế.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
