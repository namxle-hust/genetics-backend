import { Analysis, AnalysisStatus, PrismaService } from "@app/prisma";
import { Injectable } from "@nestjs/common";
import { IAnalysisUpdate } from "./analysis.model";

@Injectable()
export class ImportRepository {
    constructor(private prisma: PrismaService) {

    }

    async getAnalysisByStatus(status: AnalysisStatus): Promise<Analysis> {
        const analysis = await this.prisma.analysis.findFirst({
            where: {
                status: status
            },
            include: {
                sample: {
                    include: {
                        files: true
                    }
                },
                workspace: true
            }
        })

        return analysis;
    }

    async findFirstOrThrow(status: AnalysisStatus): Promise<Analysis> {
        const analysis = await this.prisma.analysis.findFirstOrThrow({
            where: {
                status: status
            },
            include: {
                sample: {
                    include: {
                        files: true
                    }
                },
                workspace: true
            }
        })

        return analysis;
    }

    async updateAnalysisStatus(id: number, data: IAnalysisUpdate): Promise<Analysis> {
        return this.prisma.analysis.update({
            where: { id: id },
            data: data
        })
    }
}