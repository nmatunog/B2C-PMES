-- Optimistic concurrency for membership profile edits (not bumped on provisional ID assignment during lifecycle GET).
ALTER TABLE "Participant" ADD COLUMN "memberProfileConcurrencyStamp" INTEGER NOT NULL DEFAULT 0;
