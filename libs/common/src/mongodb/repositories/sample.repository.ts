import { Injectable, Logger } from "@nestjs/common";
import { AbstractRepository, Sample } from "@app/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";

@Injectable()
export class SampleRepository extends AbstractRepository<Sample> {
    protected readonly logger = new Logger(SampleRepository.name)

    constructor(
        @InjectModel(Sample.name) sampleModel: Model<Sample>,
        @InjectConnection() connection: Connection,
    ) {
        super(sampleModel, connection)
    }
}