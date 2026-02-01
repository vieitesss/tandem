const express = require("express");
const { normalizeId } = require("../lib/ids");

const createProfilesRouter = ({ db }) => {
  const router = express.Router();

  const getProfileCount = async () => {
    if (!db) {
      return { count: 0, error: { message: "Database not ready." } };
    }

    return db.getProfileCount();
  };

  router.get("/profiles", async (_req, res) => {
    const { data, error } = await db.listProfiles();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  });

  router.post("/profiles/setup", async (req, res) => {
    const { profiles } = req.body || {};

    if (!Array.isArray(profiles) || profiles.length !== 2) {
      return res.status(400).json({ error: "Exactly two profiles are required." });
    }

    const { count, error: countError } = await getProfileCount();

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    if (count > 0) {
      return res.status(400).json({ error: "Profiles already exist." });
    }

    const { error: splitsClearError } = await db.clearTransactionSplits();

    if (splitsClearError) {
      return res.status(500).json({ error: splitsClearError.message });
    }

    const { error: transactionsClearError } = await db.clearTransactions();

    if (transactionsClearError) {
      return res.status(500).json({ error: transactionsClearError.message });
    }

    const normalizedProfiles = profiles.map((profile) => {
      const displayName = String(profile?.display_name || "").trim();
      const normalizedSplit = Number(profile?.default_split);

      return {
        display_name: displayName,
        default_split: normalizedSplit,
      };
    });

    const hasInvalidName = normalizedProfiles.some(
      (profile) => !profile.display_name
    );
    const hasInvalidSplit = normalizedProfiles.some((profile) => {
      return (
        Number.isNaN(profile.default_split) ||
        profile.default_split <= 0 ||
        profile.default_split >= 1
      );
    });

    if (hasInvalidName || hasInvalidSplit) {
      return res.status(400).json({
        error: "Profiles need a name and split between 0 and 1.",
      });
    }

    const totalSplit = normalizedProfiles.reduce(
      (sum, profile) => sum + profile.default_split,
      0
    );

    if (Math.abs(totalSplit - 1) > 0.001) {
      return res.status(400).json({ error: "Default splits must total 1." });
    }

    const { data, error } = await db.insertProfiles(normalizedProfiles);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ profiles: data || [] });
  });

  router.post("/profiles", async (req, res) => {
    const { display_name, default_split } = req.body || {};

    const { count, error: countError } = await getProfileCount();

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    if (count >= 2) {
      return res.status(400).json({ error: "Only two profiles are supported." });
    }

    if (!display_name) {
      return res.status(400).json({ error: "Display name is required." });
    }

    const normalizedSplit =
      default_split === undefined || default_split === null
        ? 0.5
        : Number(default_split);

    if (
      Number.isNaN(normalizedSplit) ||
      normalizedSplit <= 0 ||
      normalizedSplit >= 1
    ) {
      return res
        .status(400)
        .json({ error: "Default split must be between 0 and 1." });
    }

    const { data, error } = await db.insertProfile({
      display_name,
      default_split: normalizedSplit,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ id: data.id });
  });

  router.patch("/profiles/:id", async (req, res) => {
    const { id } = req.params;
    const { display_name, default_split } = req.body || {};
    const profileId = normalizeId(id);

    if (!id || Number.isNaN(profileId)) {
      return res.status(400).json({ error: "Profile id must be a number." });
    }

    const updates = {};

    if (display_name !== undefined) {
      updates.display_name = display_name;
    }

    if (default_split !== undefined) {
      const normalizedSplit = Number(default_split);

      if (
        Number.isNaN(normalizedSplit) ||
        normalizedSplit <= 0 ||
        normalizedSplit >= 1
      ) {
        return res
          .status(400)
          .json({ error: "Default split must be between 0 and 1." });
      }

      updates.default_split = normalizedSplit;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided." });
    }

    const { error } = await db.updateProfile(profileId, updates);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ id: profileId });
  });

  return router;
};

module.exports = { createProfilesRouter };
