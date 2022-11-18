import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { AbstractDocument } from "@app/common";
import { string } from "joi";

@Schema({ versionKey: false })
export class Sample extends AbstractDocument {
    @Prop()
    gene: string
}

export const SampleSchema = SchemaFactory.createForClass(Sample)