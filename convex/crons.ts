import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Put the public demo church back to its starting state every night.
crons.daily(
  "reset demo church",
  { hourUTC: 8, minuteUTC: 0 },
  internal.demo.seed,
  {},
);

export default crons;
