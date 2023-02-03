import { PGX, PrismaService } from "@app/prisma";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PgxRepository {
    constructor(private prisma: PrismaService) { }

    async findMany(rsIds: Array<string>): Promise<PGX[]> {
        const files = await this.prisma.pGX.findMany({
            where: {
                rsid: {
                    in: rsIds
                }
            },
        })
        return files
    }
}