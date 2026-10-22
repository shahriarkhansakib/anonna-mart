import "./env";
import { serve } from "@hono/node-server";
import app from "./index";
import { logger } from "./infra/lib/logger";

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname: host,
  },
  (info) => {
    logger.info(
      { module: "server", port: info.port, address: info.address },
      `🚀 Standalone GrowMate API listening on http://${info.address}:${info.port}`,
    );

    // =========================================================================
    // OPTIONAL TUNNEL SERVER (Cloudflared / Ngrok / Localtunnel)
    // Kept strictly optional & disabled by default. Uncomment if external
    // webhook forwarding (e.g. Steadfast Courier / bKash webhook IPN) is needed
    // during local standalone development.
    // =========================================================================
    /*
    if (process.env.ENABLE_TUNNEL === "true") {
      // Example: cloudflared or localtunnel instantiation
      // import("localtunnel").then(({ default: localtunnel }) => {
      //   localtunnel({ port: info.port, subdomain: "growmate-dev" }).then((tunnel) => {
      //     logger.info({ tunnelUrl: tunnel.url }, "Public development tunnel active");
      //   });
      // });
    }
    */
  },
);

const shutdown = () => {
  logger.info({ module: "server" }, "Stopping standalone server...");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
