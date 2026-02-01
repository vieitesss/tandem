const express = require("express");
const cors = require("cors");

const { createHealthRouter } = require("./routes/health");
const { createRealtimeRouter } = require("./routes/realtime");
const { createProfilesRouter } = require("./routes/profiles");
const { createTransactionsRouter } = require("./routes/transactions");
const { createCategoriesRouter } = require("./routes/categories");
const { createSummariesRouter } = require("./routes/summaries");

const { CORS_ORIGIN } = process.env;

const createApp = ({ db, realtimeBus, dbMode }) => {
  const app = express();

  app.use(cors({ origin: CORS_ORIGIN || "*" }));
  app.use(express.json());

  // Wire routers with factory injection
  app.use(createHealthRouter({ dbMode }));
  app.use(createRealtimeRouter({ db, realtimeBus }));
  app.use(createProfilesRouter({ db }));
  app.use(createTransactionsRouter({ db }));
  app.use(createCategoriesRouter({ db }));
  app.use(createSummariesRouter({ db }));

  return app;
};

module.exports = { createApp };
