import { PrismaService, Sample, SampleStatus } from "@app/prisma";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SampleRepository {
    constructor(private prisma: PrismaService) {
    }

    async getSampleByStatus (status: SampleStatus): Promise<Sample> {
        const sample = this.prisma.sample.findFirst({
            where: {
                status: status
            }
        })

        return sample;
    }
}