import { Injectable, Logger } from '@nestjs/common';
import { Analysis, AnalysisStatus, NotFoundError } from '@app/prisma';
import { InjectDb } from '@app/common/mongodb/mongo.decorators';
import { Db } from 'mongodb'
import { RESULT_ANNO_FILE, RESULT_ANNO_PGX_FILE, VCF_APPLIED_BED, VCF_FILE } from '@app/common';
import { ImportRepository } from './import.repository';
import { ConfigService } from '@nestjs/config';
import { ANALYSIS_COLLECTION_PREFIX } from '@app/common/mongodb';
import { CommonService } from './common.service';
import { IAnalysisUpdate } from './analysis.model';
import { AnalysisMongo } from './analysis-mongo.repository';

@Injectable()
export class SampleImportService {

    private s3Dir: string
    private s3AnalysesFolder: string
    private s3PublicFolder: string

    private s3Bucket: string
    private s3Profile: string

    private pharmaGkbFileName: string

    private readonly logger = new Logger(SampleImportService.name)

    constructor(
        @InjectDb() private readonly db: Db,
        private readonly importRepository: ImportRepository,
        private configService: ConfigService,
        private commonService: CommonService,
        private analysisMongo: AnalysisMongo
    ) {
        this.s3Dir = this.configService.get<string>('S3_DIR');
        this.s3AnalysesFolder = this.configService.get<string>('S3_ANALYSES_FOLDER')
        this.s3PublicFolder = this.configService.get<string>('S3_PUBLIC_FOLDER')
        this.pharmaGkbFileName = this.configService.get<string>('PHARMAGKB_FILE_PATH')
        this.s3Bucket = this.configService.get<string>('S3_BUCKET')
        this.s3Profile = this.configService.get<string>('S3_PROFILE')
    }

    getHello(): string {
        return 'Hello World!';
    }

    async addPgx(analysis: Analysis) {
        const pgxSource = `${this.s3Dir}/${this.s3PublicFolder}/${this.pharmaGkbFileName}`

        const annoFile = `${this.s3Dir}/${this.s3AnalysesFolder}/${analysis.id}/${RESULT_ANNO_FILE}`;

        const annoPgxFile = `${this.s3Dir}/${this.s3AnalysesFolder}/${analysis.id}/${RESULT_ANNO_PGX_FILE}`;

        let command = `awk -F"\t" 'FNR==NR{a[$1]=1; next}{ if ($1 == "analysisId") { print $0"\tPGx"; } else { PGx = "."; if (a[$9] == 1) { PGx = 1; } print $0"\t"PGx; } }' ${pgxSource} ${annoFile} > ${annoPgxFile}`

        await this.commonService.runCommand(command);
    }

    async getTotalVariant(analysis: Analysis): Promise<number> {
        try {
            const collectionName = `${ANALYSIS_COLLECTION_PREFIX}_${analysis.id}`

            let cond = {
                selected_variant:  { $ne: 0 }
            }

            const total = await this.analysisMongo.count(collectionName, cond);

            return total

        } catch (error) {
            this.logger.error(error);
        }
    }


    async importAnalysis() {
        let analysisId;
        try {
            const analysisImporting = await this.importRepository.getAnalysisByStatus(AnalysisStatus.IMPORTING)

            if (!analysisImporting) {
                const analysis = await this.importRepository.findFirstOrThrow(AnalysisStatus.IMPORT_QUEUING);

                this.logger.log(analysis);

                analysisId = analysis.id;

                this.importRepository.updateAnalysisStatus(analysis.id, { status: AnalysisStatus.IMPORTING })

                // Adding pgx
                await this.addPgx(analysis);

                // Import to mongodb
                await this.mongoImport(analysis);

                const totalVariants = await this.getTotalVariant(analysis);

                let data: IAnalysisUpdate = {
                    status: AnalysisStatus.ANALYZED,
                    vcfFilePath: `${VCF_FILE}.gz`,
                    totalVariants: totalVariants
                }

                await this.importRepository.updateAnalysisStatus(analysis.id, data)

                await this.uploadVcfFileToS3(analysis)

                this.logger.log('Done import');
            }
        } catch (error) {
            if (error instanceof NotFoundError) {
                return;   
            }
            if (analysisId) {
                this.importRepository.updateAnalysisStatus(analysisId, { status: AnalysisStatus.ERROR })
            }
            this.logger.error(error);
        }   
        
    }

    async uploadVcfFileToS3(analysis: Analysis) {
        let vcfSource = `${this.s3Dir}/${this.s3AnalysesFolder}/${analysis.id}/${VCF_FILE}.gz`
        let tbiSource = `${vcfSource}.tbi`

        let commands = [
            `aws s3 cp ${vcfSource} s3://${this.s3Bucket}/${this.s3AnalysesFolder}/${analysis.id}/ > /dev/null`,
            `aws s3 cp ${tbiSource} s3://${this.s3Bucket}/${this.s3AnalysesFolder}/${analysis.id}/ > /dev/null`,
        ]

        let command = commands.join(' && ')

        await this.commonService.runCommand(command);
    }

    async mongoImport(analysis: Analysis) {
        const collectionName = `${ANALYSIS_COLLECTION_PREFIX}_${analysis.id}`

        const annoFile = `${this.s3Dir}/${this.s3AnalysesFolder}/${analysis.id}/${RESULT_ANNO_PGX_FILE}`


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
