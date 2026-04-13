import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily ingestion: pick up new videos
// Runs at 6am UTC (midnight CT)
crons.daily(
  "daily-ingest",
  { hourUTC: 6, minuteUTC: 0 },
  internal.ingest.incrementalIngest
);

// Vid of the Day rotation: pick a random featured video
// Runs at 6:05am UTC (right after ingest)
crons.daily(
  "daily-featured",
  { hourUTC: 6, minuteUTC: 5 },
  internal.featured.rotateDaily
);

export default crons;
