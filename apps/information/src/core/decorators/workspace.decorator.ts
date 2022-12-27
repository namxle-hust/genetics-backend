import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { registerDecorator, ValidationOptions } from "class-validator";
import { WorkspaceExistRule } from "../constraints";

export function WorkspaceExist(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'WorkspaceExist',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: WorkspaceExistRule,
        });
    };
}
