import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateSkillDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;
}
