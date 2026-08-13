import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferenceType } from '../../commonTypes';
import { EmailRegistryController } from './email-registry.controller';
import { EmailRegistryService } from './email-registry.service';
import { RecipientSelectionService } from './recipient-selection.service';

describe('EmailRegistryController', () => {
  let controller: EmailRegistryController;
  let emailRegistryService: {
    findAllPaginated: jest.Mock;
    upsert: jest.Mock;
    remove: jest.Mock;
  };
  let recipientSelectionService: {
    findEligibleRecipientsPaginated: jest.Mock;
  };

  beforeEach(async () => {
    emailRegistryService = {
      findAllPaginated: jest.fn(),
      upsert: jest.fn(),
      remove: jest.fn(),
    };
    recipientSelectionService = {
      findEligibleRecipientsPaginated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailRegistryController],
      providers: [
        { provide: EmailRegistryService, useValue: emailRegistryService },
        {
          provide: RecipientSelectionService,
          useValue: recipientSelectionService,
        },
      ],
    }).compile();

    controller = module.get(EmailRegistryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists registry entries with parsed pagination', async () => {
    emailRegistryService.findAllPaginated.mockResolvedValue({
      items: [],
      total: 0,
      hasMore: false,
    });

    await controller.findAll('10', '5');

    expect(emailRegistryService.findAllPaginated).toHaveBeenCalledWith(10, 5);
  });

  it('lists eligible recipients with notification type and pagination', async () => {
    recipientSelectionService.findEligibleRecipientsPaginated.mockResolvedValue(
      {
        items: [],
        total: 0,
        hasMore: false,
      },
    );

    await controller.findEligible(
      NotificationPreferenceType.NEW_DATASET,
      undefined,
      '50',
    );

    expect(
      recipientSelectionService.findEligibleRecipientsPaginated,
    ).toHaveBeenCalledWith(NotificationPreferenceType.NEW_DATASET, 0, 50);
  });

  it('upserts and deletes via the service', async () => {
    await controller.upsert({ email: 'a@b.com' });
    expect(emailRegistryService.upsert).toHaveBeenCalledWith({
      email: 'a@b.com',
    });

    await controller.remove('id-1');
    expect(emailRegistryService.remove).toHaveBeenCalledWith('id-1');
  });
});
