import { AnalysisStatus } from "@app/prisma";

export interface IAnalysisUpdate {
    status: AnalysisStatus,
    vcfFilePath?: string
}