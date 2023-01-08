import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { registerDecorator, ValidationOptions } from "class-validator";
import { SampleExistsRule, SamplePosessionRule } from "../constraints";

export function SampleExists(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'SampleExists',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: SampleExistsRule,
        });
    };
}

export function SamplePosession(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'SamplePosession',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: SamplePosessionRule,
        });
    };
}