import "./globals.css";

import BottomNav from "./BottomNav";
import { ToastProvider } from "./shared/ToastProvider";

export const metadata = {
  title: "Tandem — Shared Finance, Clearly",
  description: "A modern, editorial expense workspace for couples",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://use.fontawesome.com/releases/v5.15.4/css/all.css"
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-cream-500/20 selection:text-cream-50">
        <ToastProvider>
          {children}
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
