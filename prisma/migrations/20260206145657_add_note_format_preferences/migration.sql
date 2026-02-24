-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "noteFormat" TEXT NOT NULL DEFAULT 'paragraph',
ADD COLUMN     "visibleSections" JSONB NOT NULL DEFAULT '[]';
