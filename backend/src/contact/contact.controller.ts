import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactInput } from './dto/contact.input';

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  async submitMessage(@Body() body: ContactInput) {
    return this.contactService.createMessage(body);
  }
}
