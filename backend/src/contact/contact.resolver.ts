// contact.resolver.ts
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { ContactService } from './contact.service';
import { ContactInput } from './dto/contact.input';

@Resolver()
export class ContactResolver {
  constructor(private readonly contactService: ContactService) {}

  @Mutation(() => Boolean)
  async sendContactMessage(@Args('input') input: ContactInput) {
    return this.contactService.send(input); 
  }
}
