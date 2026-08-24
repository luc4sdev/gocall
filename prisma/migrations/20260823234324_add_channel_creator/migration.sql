-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
