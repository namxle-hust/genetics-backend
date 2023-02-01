import { Injectable, Logger } from '@nestjs/common';
import { AnalysisStatus, NotFoundError, PrismaService } from '@app/prisma';
import { InjectDb } from '@app/common/mongodb/mongo.decorators';
import { Db } from 'mongodb'
import { ImportRepository } from './import.repository';

@Injectable()
export class SampleImportService {

    private readonly logger = new Logger(SampleImportService.name)

    constructor(
        @InjectDb() private readonly db: Db,
        private readonly importRepository: ImportRepository
    ) {

    }

    getHello(): string {
        return 'Hello World!';
    }

    // async test2(): Promise<string> {
    //     console.log(123);
    //     const count = await this.db.collection("samples").find();
    //     await new Promise((resolve, reject) => {
    //         setTimeout(() => {
    //             return resolve(true);
    //         }, 10000)
    //     })
    //     return 'users count:' + count;
    // }

    // async test(): Promise<any> {
    //     const user = await this.prisma.user.create({
    //         data: {
    //             email: 'namledz707@gmail.com',
    //             hash: "abc"
    //         }
    //     })
    //     return user;
    // }

    async importAnalysis() {
        try {
            const analysisImporting = await this.importRepository.getAnalysisByStatus(AnalysisStatus.IMPORTING)

            if (!analysisImporting) {
                const analysis = await this.importRepository.findFirstOrThrow(AnalysisStatus.IMPORT_QUEUING);

                this.logger.log(analysis);
            }
        } catch (error) {
            if (error instanceof NotFoundError) {
                return;   
            }
            this.logger.error(error);
        }   
        
    }
}
