import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AssessmentFlow | Powered by KhulnaTech",
  description: "Secure, time-controlled online assessment system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
        <div id="root-portal"></div>
      </body>
    </html>
  );
}
