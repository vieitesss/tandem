const express = require("express");
const { getSnapshotStatus } = require("../snapshot");

const createHealthRouter = ({ dbMode }) => {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    const response = {
      status: "ok",
      database: dbMode,
    };

    if (dbMode === "local") {
      response.snapshot = getSnapshotStatus();
    }

    res.json(response);
  });

  return router;
};

module.exports = { createHealthRouter };
