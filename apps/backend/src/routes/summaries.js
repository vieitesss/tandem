const express = require("express");
const { buildDebtSummary } = require("../services/debtSummary");
const { buildPersonMonthlySummary } = require("../services/personMonthlySummary");
const { buildTimeline } = require("../services/timeline");

const createSummariesRouter = ({ db }) => {
  const router = express.Router();

  // GET /debt-summary - Get debt summary between profiles
  router.get("/debt-summary", async (_req, res) => {
    const { data, error } = await buildDebtSummary({ db });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  });

  // GET /person-monthly-summary - Get monthly financial summary per person
  router.get("/person-monthly-summary", async (_req, res) => {
    const { data, error } = await buildPersonMonthlySummary({ db });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  });

  // GET /timeline - Get relationship financial timeline with insights and milestones
  router.get("/timeline", async (_req, res) => {
    const { data, error } = await buildTimeline({ db });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  });

  return router;
};

module.exports = { createSummariesRouter };
