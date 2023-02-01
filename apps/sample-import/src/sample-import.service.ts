import { Injectable, Logger } from '@nestjs/common';
import { Analysis, AnalysisStatus, NotFoundError } from '@app/prisma';
import { InjectDb } from '@app/common/mongodb/mongo.decorators';
import { Db } from 'mongodb'
import { RESULT_ANNO_FILE, VCF_FILE } from '@app/common';
import { ImportRepository } from './import.repository';
import { ConfigService } from '@nestjs/config';
import { ANALYSIS_COLLECTION_PREFIX } from '@app/common/mongodb';
import { CommonService } from './common.service';
import { IAnalysisUpdate } from './analysis.model';

@Injectable()
export class SampleImportService {

    private readonly logger = new Logger(SampleImportService.name)

    constructor(
        @InjectDb() private readonly db: Db,
        private readonly importRepository: ImportRepository,
        private configService: ConfigService,
        private commonService: CommonService
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

                this.importRepository.updateAnalysisStatus(analysis.id, { status: AnalysisStatus.IMPORTING })

                await this.mongoImport(analysis);
                
                this.logger.log('Done import');

                let data: IAnalysisUpdate = {
                    status: AnalysisStatus.ANALYZED,
                    vcfFilePath: `${VCF_FILE}.gz`
                }

                this.importRepository.updateAnalysisStatus(analysis.id, data)
            }
        } catch (error) {
            if (error instanceof NotFoundError) {
                return;   
            }
            this.logger.error(error);
        }   
        
    }

    async mongoImport(analysis: Analysis) {
        const collectionName = `${ANALYSIS_COLLECTION_PREFIX}_${analysis.id}`

        const annoFile = `${this.configService.get<string>('S3_DIR')}/${this.configService.get<string>('S3_ANALYSES_FOLDER')}/${analysis.id}/${RESULT_ANNO_FILE}`


        let options = [
            `--uri ${this.configService.get<string>('MONGODB_URI')}`,
            `--collection ${collectionName}`,
            `--db ${this.configService.get<string>('MONGODB_DATABASE')}`,
            `--type tsv`,
            `--headerline`,
            `--file ${annoFile}`,
            `--drop`,
            `--authenticationDatabase=admin`
        ]

        let command = `${this.configService.get<string>('MONGO_IMPORT_CMD')} ${options.join(' ')}`

        await this.commonService.runCommand(command);

        return true;
    }
}
