import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Chip Simulator - Texas Hold'em",
  description:
    "Minimal dark mode real-time chip and pot simulator for in-person Texas Hold'em games with physical cards.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chip Simulator",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0c10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function logEvent(type, data) {
                  try {
                    fetch('/api/client-log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: type, data: data, ua: navigator.userAgent, time: new Date().toISOString() })
                    }).catch(function(){});
                  } catch(e) {}
                }
                window.__logEvent = logEvent;
                logEvent('HEAD_INIT', { url: location.href });
                window.addEventListener('error', function(e) {
                  logEvent('ERROR', { msg: e.message, src: e.filename, line: e.lineno, col: e.colno, stack: e.error ? e.error.stack : '' });
                });
                window.addEventListener('unhandledrejection', function(e) {
                  logEvent('UNHANDLED_REJECTION', { reason: String(e.reason) });
                });
                document.addEventListener('DOMContentLoaded', function() {
                  logEvent('DOM_CONTENT_LOADED', {});
                });
                window.addEventListener('load', function() {
                  logEvent('WINDOW_LOADED', {});
                });
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
