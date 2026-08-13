import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationLogService } from './communication-log.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { CommunicationLog } from './entities/communication-log.entity';
import { repositoryMockFactory } from 'src/mocks';

describe('CommunicationLogService', () => {
  let service: CommunicationLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationLogService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: getRepositoryToken(CommunicationLog), useFactory: repositoryMockFactory },
      ],
    }).compile();

    service = module.get<CommunicationLogService>(CommunicationLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
