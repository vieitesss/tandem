import "./globals.css";

export const metadata = {
  title: "Tandem",
  description: "Couple's expense manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        {children}
      </body>
    </html>
  );
}
