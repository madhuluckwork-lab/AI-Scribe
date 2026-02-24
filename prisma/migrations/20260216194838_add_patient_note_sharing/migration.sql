-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PATIENT';

-- CreateTable
CREATE TABLE "note_shares" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "message" TEXT,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_share_invites" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_share_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_shares_patientId_idx" ON "note_shares"("patientId");

-- CreateIndex
CREATE INDEX "note_shares_noteId_idx" ON "note_shares"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "note_shares_noteId_patientId_key" ON "note_shares"("noteId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "note_share_invites_token_key" ON "note_share_invites"("token");

-- CreateIndex
CREATE INDEX "note_share_invites_token_idx" ON "note_share_invites"("token");

-- CreateIndex
CREATE INDEX "note_share_invites_patientEmail_idx" ON "note_share_invites"("patientEmail");

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_share_invites" ADD CONSTRAINT "note_share_invites_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_share_invites" ADD CONSTRAINT "note_share_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
