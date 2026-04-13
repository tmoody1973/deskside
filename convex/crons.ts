import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily ingestion: pick up new Tiny Desk videos
// Runs at 6am UTC (midnight CT) when YouTube quota resets
crons.daily(
  "daily-ingest",
  { hourUTC: 6, minuteUTC: 0 },
  internal.ingest.incrementalIngest
);

export default crons;
