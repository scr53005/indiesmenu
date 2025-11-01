-- AlterTable
ALTER TABLE "dishes" ADD COLUMN     "description" TEXT,
ADD COLUMN     "position" INTEGER DEFAULT 0,
ADD COLUMN     "sold_out" BOOLEAN DEFAULT false;
