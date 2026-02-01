const express = require("express");

const createRealtimeRouter = ({ db, realtimeBus }) => {
  const router = express.Router();

  router.get("/realtime", (req, res) => {
    const tablesParam = req.query.tables;
    const tables = Array.isArray(tablesParam)
      ? tablesParam
      : typeof tablesParam === "string"
        ? tablesParam.split(",")
        : [];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const send = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send({ type: "connected" });

    const unsubscribe = realtimeBus.subscribe(tables, send);
    const keepAlive = setInterval(() => {
      res.write(": ping\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
      res.end();
    });
  });

  router.get("/changes", async (req, res) => {
    if (!db || typeof db.getChangesSince !== "function") {
      return res.status(500).json({ error: "Database not ready." });
    }

    const sinceParam = req.query.since;
    const since = Number(sinceParam ?? 0);

    if (Number.isNaN(since) || since < 0) {
      return res
        .status(400)
        .json({ error: "Since cursor must be a non-negative number." });
    }

    const tablesParam = req.query.tables;
    const tables = Array.isArray(tablesParam)
      ? tablesParam
      : typeof tablesParam === "string"
        ? tablesParam.split(",")
        : [];
    const normalizedTables = tables
      .map((table) => String(table || "").trim())
      .filter((table) => table.length > 0);

    const { latest_id, has_changes, error } = await db.getChangesSince({
      since,
      tables: normalizedTables,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      latest_id: latest_id || 0,
      has_changes: Boolean(has_changes),
    });
  });

  return router;
};

module.exports = { createRealtimeRouter };
