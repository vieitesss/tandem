import "./globals.css";

import BottomNav from "./BottomNav";

export const metadata = {
  title: "Tandem",
  description: "Couple's expense manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://use.fontawesome.com/releases/v5.15.4/css/all.css"
        />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-50">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
