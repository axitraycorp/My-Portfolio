
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ContactInput {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  message: string;
}
