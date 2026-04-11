-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "memberProfileSnapshot" JSONB,
ADD COLUMN     "mailingAddress" TEXT,
ADD COLUMN     "civilStatus" TEXT,
ADD COLUMN     "memberIdNo" TEXT;
