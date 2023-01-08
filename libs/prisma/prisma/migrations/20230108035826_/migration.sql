-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NORMAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('FASTQ', 'VCF');

-- CreateEnum
CREATE TYPE "VcfType" AS ENUM ('WGS', 'WES');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('FASTQ_QUEUING', 'FASTQ_ANALYZING', 'VCF_QUEUING', 'VCF_ANALYZING', 'IMPORT_QUEUING', 'ANALYZED', 'ERROR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'NORMAL',
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "type" "SampleType" NOT NULL DEFAULT 'VCF',

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "uploadedName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sampleId" INTEGER NOT NULL,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "sampleId" INTEGER NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'VCF_QUEUING',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "vcfFilePath" TEXT,
    "totalVariants" INTEGER,
    "totalGenes" INTEGER,
    "description" TEXT,
    "vcfType" "VcfType" NOT NULL DEFAULT 'WES',
    "gender" "Gender",

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_userId_name_key" ON "workspaces"("userId", "name");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
