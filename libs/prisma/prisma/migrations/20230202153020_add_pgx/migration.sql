-- CreateTable
CREATE TABLE "pgx" (
    "id" SERIAL NOT NULL,
    "rsid" TEXT NOT NULL,
    "gene" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "clinical_annotation_types" TEXT NOT NULL,
    "related_chemicals" TEXT NOT NULL,
    "drug_response_category" TEXT NOT NULL,
    "related_diseases" TEXT NOT NULL,
    "annotation_text" TEXT NOT NULL,

    CONSTRAINT "pgx_pkey" PRIMARY KEY ("id")
);
