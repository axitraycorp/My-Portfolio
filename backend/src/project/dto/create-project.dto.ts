import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

@InputType()
export class CreateProjectDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field()
  @IsString()
  techStack: string;

  @Field()
  @IsUrl()
  githubUrl: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  liveUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  image?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillIds?: string[];
}
