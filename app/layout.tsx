import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clareza · Finanças pessoais",
  description: "Seu dinheiro em um lugar só. Registre gastos, organize contas e acompanhe suas metas.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
