import { Injectable } from "@nestjs/common";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { WorkspaceRepository } from "../repository";

@ValidatorConstraint({ name: 'WorkspaceExists', async: true })
@Injectable()
export class WorkspaceExistRule implements ValidatorConstraintInterface {
    constructor(private workspaceRepository: WorkspaceRepository) { }

    async validate(value: number) {
        try {
            await this.workspaceRepository.findById(value);
        } catch (e) {
            console.log(e);
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `Workspace doesn't exist`;
    }
}