// src/project/dto/create-project.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  techStack: string;

  @Field()
  githubUrl: string;

  @Field(() => [String])
  skillIds: string[];

  @Field({ nullable: true })
  liveUrl?: string;

  @Field({ nullable: true })
  image?: string;
}
