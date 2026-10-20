import { Test, TestingModule } from '@nestjs/testing';
import { SkillService } from './skill.service';
import { testProviders } from '../test-utils/providers';

describe('SkillService', () => {
  let service: SkillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillService, ...testProviders],
    }).compile();

    service = module.get<SkillService>(SkillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
