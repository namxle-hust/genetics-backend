import { Analysis, AnalysisStatus, PrismaService } from "@app/prisma";
import { Injectable } from "@nestjs/common";
@Injectable()
export class AnalysisRepository {
    constructor(private prisma: PrismaService) { }


    async update(id: number, status: AnalysisStatus): Promise<Analysis> {
        try {
            const analysis = await this.prisma.analysis.update({
                where: { id: id }, data: {
                    status: status
                }
            })
            return analysis;
        }
        catch (error) {
            throw error;
        }
    }
}