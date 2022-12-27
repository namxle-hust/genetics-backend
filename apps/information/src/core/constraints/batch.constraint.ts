import { Inject, Injectable } from "@nestjs/common";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { BatchRepository } from "../repository";

@ValidatorConstraint({ name: 'BatchExists', async: true })
@Injectable()
export class BatchExistsRule implements ValidatorConstraintInterface {
    constructor(protected readonly batchRepository: BatchRepository) { }

    async validate(value: number) {
        try {
            await this.batchRepository.findById(value);
        } catch (e) {
            console.log(e);
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `Batch doesn't exist`;
    }
}


@ValidatorConstraint({ name: 'BatchPossession', async: true })
@Injectable()
export class BatchPossessionRule implements ValidatorConstraintInterface {
    constructor(private batchRepository: BatchRepository) { }

    async validate(value: number, args: ValidationArguments) {
        try {
            let batch = await this.batchRepository.findById(value);

            if (batch.userId != args.value) {
                return false
            }
        } catch (e) {
            console.log(e);
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `Forbiden`;
    }
}
