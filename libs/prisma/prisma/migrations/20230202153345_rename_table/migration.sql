/*
  Warnings:

  - You are about to drop the PGx table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "pgx";

-- CreateTable
CREATE TABLE "PGx" (
    "id" SERIAL NOT NULL,
    "rsid" TEXT NOT NULL,
    "gene" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "clinical_annotation_types" TEXT NOT NULL,
    "related_chemicals" TEXT NOT NULL,
    "drug_response_category" TEXT NOT NULL,
    "related_diseases" TEXT NOT NULL,
    "annotation_text" TEXT NOT NULL,

    CONSTRAINT "PGx_pkey" PRIMARY KEY ("id")
);

