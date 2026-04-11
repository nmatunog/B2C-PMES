-- AlterTable — links Firebase Auth uid to this row (multiple NULLs allowed before link)
ALTER TABLE "Participant" ADD COLUMN "firebaseUid" TEXT;

CREATE UNIQUE INDEX "Participant_firebaseUid_key" ON "Participant"("firebaseUid");
