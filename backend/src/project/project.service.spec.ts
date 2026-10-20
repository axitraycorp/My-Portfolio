import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { testProviders } from '../test-utils/providers';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectService, ...testProviders],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
