-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "callsign" TEXT;
ALTER TABLE "Participant" ADD COLUMN "lastNameKey" TEXT;
ALTER TABLE "Participant" ADD COLUMN "lastNameSeq" INTEGER;

-- CreateTable
CREATE TABLE "LastNameCounter" (
    "lastNameKey" TEXT NOT NULL,
    "nextSeq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LastNameCounter_pkey" PRIMARY KEY ("lastNameKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_callsign_key" ON "Participant"("callsign");
