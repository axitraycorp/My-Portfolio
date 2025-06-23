import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Skill } from 'src/skill/models/skill.model';

@ObjectType()
export class Project {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  techStack: string;

  @Field()
  githubUrl: string;

  @Field({ nullable: true })
  liveUrl?: string;

  @Field({ nullable: true })
  image?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Skill])
  skills: Skill[];
}
