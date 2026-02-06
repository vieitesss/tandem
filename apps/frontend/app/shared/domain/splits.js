export const parsePercentValue = (value) => {
  const normalized = Number(value);
  if (Number.isNaN(normalized) || normalized <= 0 || normalized >= 100) {
    return null;
  }

  return normalized;
};

export const parsePercentFraction = (value) => {
  const percentValue = parsePercentValue(value);
  if (percentValue === null) {
    return null;
  }

  return percentValue / 100;
};

export const buildDefaultPercentSplits = (profiles) => {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return [];
  }

  return profiles.map((profile) => ({
    user_id: profile.id,
    percent: Number(profile.default_split || 0) * 100,
  }));
};

export const buildDefaultCustomSplits = (profiles) => {
  const validProfiles = Array.isArray(profiles)
    ? profiles.filter((profile) => profile?.id)
    : [];

  if (validProfiles.length === 0) {
    return [];
  }

  const splits = validProfiles.map((profile) => ({
    user_id: String(profile.id),
    percent: String(Math.round(Number(profile.default_split || 0) * 1000) / 10),
  }));

  const total = splits.reduce((sum, split) => sum + Number(split.percent || 0), 0);

  if (
    Math.abs(total - 100) <= 0.01 &&
    !splits.some((split) => Number(split.percent) <= 0)
  ) {
    return splits;
  }

  const equalShare = Math.round((100 / validProfiles.length) * 10) / 10;
  return validProfiles.map((profile) => ({
    user_id: String(profile.id),
    percent: String(equalShare),
  }));
};
