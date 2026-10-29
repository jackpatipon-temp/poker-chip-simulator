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

                // Capture phase to catch script and network resource errors
                window.addEventListener('error', function(e) {
                  var target = e.target;
                  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                    logEvent('RESOURCE_ERROR', {
                      tagName: target.tagName,
                      src: target.src || target.href,
                      type: e.type
                    });
                  } else {
                    logEvent('ERROR', {
                      msg: e.message || 'unknown',
                      src: e.filename || '',
                      line: e.lineno || 0,
                      col: e.colno || 0,
                      stack: e.error ? e.error.stack : ''
                    });
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  logEvent('UNHANDLED_REJECTION', { reason: String(e.reason) });
                });

                document.addEventListener('DOMContentLoaded', function() {
                  logEvent('DOM_CONTENT_LOADED', {});
                });

                window.addEventListener('load', function() {
                  logEvent('WINDOW_LOADED', {});
                  // Check status of all scripts after 2 seconds
                  setTimeout(function() {
                    var scripts = Array.from(document.querySelectorAll('script[src]')).map(function(s) {
                      return { src: s.src.replace(location.origin, ''), async: s.async, defer: s.defer };
                    });
                    logEvent('SCRIPTS_INFO', { count: scripts.length, scripts: scripts });
                  }, 2000);
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
