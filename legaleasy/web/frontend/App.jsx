import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NavMenu, useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import Routes from "./Routes";

import { QueryProvider, PolarisProvider } from "./components";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.glob("./pages/**/!(*.test.[jt]sx)*.([jt]sx)", {
    eager: true,
  });
  const { t } = useTranslation();
  const shopify = useAppBridge();

  // Make an authenticated API call on mount to verify session tokens
  useEffect(() => {
    const pingBackend = async () => {
      try {
        console.log("Making authenticated ping request...");
        const token = await shopify.idToken();
        const response = await fetch("/api/ping", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log("Ping response:", data);
      } catch (error) {
        console.error("Ping failed:", error);
      }
    };
    pingBackend();
  }, [shopify]);

  return (
    <PolarisProvider>
      <BrowserRouter>
        <QueryProvider>
          <NavMenu>
            <a href="/" rel="home" />
            <a href="/settings">Settings</a>
          </NavMenu>
          <Routes pages={pages} />
        </QueryProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
