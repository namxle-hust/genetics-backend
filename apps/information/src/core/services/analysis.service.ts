import { NotFoundError, AnalysisStatus, Analysis } from '@app/prisma';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisCreateDTO, AnalysisFilterDTO, AnalysisUpdateDTO, TableDTO } from '../dto';
import { AnalysisFindInput, IAnalysisCreateInput, IAnalysisFindInput, IAnalysisUpdateInput, TableFindInput } from '../models';
import { TableOutputEntity, AnalysisEntity } from '../entities';
import { AnalysisRepository, SampleRepository } from '../repository';
@Injectable({})
export class AnalysisService {

    private readonly logger = new Logger(AnalysisService.name)

    constructor(private readonly analysisRepository: AnalysisRepository, private readonly sampleRepository: SampleRepository) { }
    
    async getAnalyses(dto: TableDTO<AnalysisFilterDTO>, userId: number): Promise<TableOutputEntity<AnalysisEntity>> {
        let result: TableOutputEntity<AnalysisEntity> = {
            items: [],
            total: 0
        }

        let findInput: IAnalysisFindInput = new AnalysisFindInput(dto, userId);

        // this.logger.debug(JSON.stringify(findInput));

        let tableFindDto = new TableFindInput<IAnalysisFindInput, AnalysisFilterDTO>(dto, findInput);

        const total = await this.analysisRepository.count(tableFindDto);

        if (total > 0) {
            const analysis = await this.analysisRepository.findMany(tableFindDto);

            const items = analysis.map((item) => new AnalysisEntity(item));

            result.items = items;
            result.total = total;
        }

        return result
    }

    async updateAnalysis(dto: AnalysisUpdateDTO, userId: number, id: number): Promise<Analysis> {
        let data: IAnalysisUpdateInput = {
            name: dto.name
        }

        let analysis = await this.analysisRepository.findById(id);

        return await this.analysisRepository.update(id, data);
    }


    async getAnalysis(id: number): Promise<Analysis> {
        const analysis = await this.analysisRepository.findById(id);
        return analysis;
    }

    async createAnalysis(dto: AnalysisCreateDTO, userId: number) {
        let status;

        let sample = await this.sampleRepository.findById(dto.sampleId);

        if (sample.type == 'FASTQ') {
            status = AnalysisStatus.FASTQ_QUEUING
        } else {
            status = AnalysisStatus.VCF_QUEUING
        }

        let data: IAnalysisCreateInput = {
            status: status,
            ...dto
        };

        const analysis = await this.analysisRepository.create(data);

        return analysis;
    }

    async removeAnalysis(userId: number, id: number) {
        const analysis = await this.analysisRepository.findById(id);
        return await this.analysisRepository.update(id, { isDeleted: true });
    }

    async getAnalysisDetail(userId: number, id: number): Promise<AnalysisEntity> {
        try {
            const analysis = await this.analysisRepository.findByIdOrFail(id);

            const data = new AnalysisEntity(analysis);
            if (data.sample.userId != userId) {
                throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
            }
            return data;
        } catch(error) {
            if (error instanceof NotFoundError) {
                throw new HttpException('Analysis Not Found', HttpStatus.NOT_FOUND)
            }
            throw error;
        }
    }


}
