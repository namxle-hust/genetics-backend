import { Inject, Injectable } from "@nestjs/common";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { UserRepository } from "../repository";

@ValidatorConstraint({ name: 'UserExists', async: true })
@Injectable({})
export class UserExistsRule implements ValidatorConstraintInterface {
    constructor(@Inject(UserRepository) private usersRepository: UserRepository) { }

    async validate(value: number) {
        try {
            await this.usersRepository.findById(value);
        } catch (e) {
            console.log(e);
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `User doesn't exist`;
    }
}