/*
  Warnings:

  - Added the required column `name` to the `samples` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "samples" ADD COLUMN     "name" TEXT NOT NULL;
