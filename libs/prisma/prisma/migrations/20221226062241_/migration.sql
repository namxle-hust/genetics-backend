-- AlterTable
ALTER TABLE "samples" ALTER COLUMN "totalVariants" DROP NOT NULL,
ALTER COLUMN "totalGenes" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;
