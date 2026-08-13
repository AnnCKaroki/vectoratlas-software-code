import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationSentStatus } from '../../../src/commonTypes';
import { CommunicationLogController } from './communication-log.controller';
import { CommunicationLogService } from './communication-log.service';

describe('CommunicationLogController', () => {
  let controller: CommunicationLogController;
  let communicationLogService: {
    upsert: jest.Mock;
    getCommunicationsPaginated: jest.Mock;
    getCommunication: jest.Mock;
    update: jest.Mock;
    updateSentStatus: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    communicationLogService = {
      upsert: jest.fn(),
      getCommunicationsPaginated: jest.fn(),
      getCommunication: jest.fn(),
      update: jest.fn(),
      updateSentStatus: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunicationLogController],
      providers: [
        {
          provide: CommunicationLogService,
          useValue: communicationLogService,
        },
      ],
    }).compile();

    controller = module.get(CommunicationLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists logs with parsed pagination', async () => {
    communicationLogService.getCommunicationsPaginated.mockResolvedValue({
      items: [],
      total: 0,
      hasMore: false,
    });

    await controller.findAll('0', '20');

    expect(
      communicationLogService.getCommunicationsPaginated,
    ).toHaveBeenCalledWith(0, 20);
  });

  it('wires updateSentStatus with body fields', async () => {
    communicationLogService.updateSentStatus.mockResolvedValue({ id: '1' });

    await controller.updateSentStatus('1', {
      sentStatus: CommunicationSentStatus.SENT,
      errorDescription: undefined,
    });

    expect(communicationLogService.updateSentStatus).toHaveBeenCalledWith(
      '1',
      CommunicationSentStatus.SENT,
      null,
    );
  });
});
