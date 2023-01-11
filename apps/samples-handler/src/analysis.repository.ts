import { PrismaService, AnalysisStatus, Analysis } from "@app/prisma";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AnalysisRepository {
    constructor(private prisma: PrismaService) {
    }

    async getAnalysisByStatus(status: AnalysisStatus): Promise<Analysis> {
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

    async updateAnalysisStatus(id: number, status: AnalysisStatus): Promise<Analysis> {
        return this.prisma.analysis.update({
            where: { id: id },
            data: { status: status }
        })
    }
}