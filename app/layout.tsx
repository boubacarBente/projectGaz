import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ToastContainer } from "react-toastify";
import { SettingsProvider } from "./parametres/page";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion Gaz",
  description:
    "Application de gestion pour une entreprise de distribution de bouteilles de gaz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <SettingsProvider>
          <AppShell>{children}</AppShell>
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </SettingsProvider>
      </body>
    </html>
  );
}
