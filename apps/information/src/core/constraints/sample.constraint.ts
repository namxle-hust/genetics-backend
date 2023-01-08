import { Inject, Injectable } from "@nestjs/common";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { SampleRepository } from "../repository";

@ValidatorConstraint({ name: 'SampleExists', async: true })
@Injectable()
export class SampleExistsRule implements ValidatorConstraintInterface {
    constructor(protected readonly sampleRepository: SampleRepository) { }

    async validate(value: number) {
        try {
            await this.sampleRepository.findById(value);
        } catch (e) {
            console.log(e);
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `Sample doesn't exist`;
    }
}


@ValidatorConstraint({ name: 'SamplePosession', async: true })
@Injectable()
export class SamplePosessionRule implements ValidatorConstraintInterface {
    constructor(private sampleRepository: SampleRepository) { }

    async validate(value: number, args: ValidationArguments) {
        try {
            let sample = await this.sampleRepository.findById(value);

            if (sample.userId != args.value) {
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
