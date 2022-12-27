import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { registerDecorator, ValidationOptions } from "class-validator";
import { BatchExistsRule, BatchPossessionRule } from "../constraints";

export function BatchExists(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'BatchExists',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: BatchExistsRule,
        });
    };
}

export function BatchPossession(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'BatchPossession',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: BatchPossessionRule,
        });
    };
}