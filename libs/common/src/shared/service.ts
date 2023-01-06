import { Logger } from "@nestjs/common";

export class Service {
    protected readonly logger = new Logger(Service.name)
}