import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  async submitMessage(
    @Body() body: { name: string; email: string; message: string },
  ) {
    return this.contactService.createMessage(body);
  }
}
