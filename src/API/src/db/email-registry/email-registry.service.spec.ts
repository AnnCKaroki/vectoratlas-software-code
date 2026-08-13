import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType, repositoryMockFactory } from 'src/mocks';
import { Repository } from 'typeorm';
import { EmailRegistry } from './entities/email-registry.entity';
import { EmailRegistryService } from './email-registry.service';

describe('EmailRegistryService', () => {
  let service: EmailRegistryService;
  let emailRegistryRepositoryMock: MockType<Repository<EmailRegistry>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailRegistryService,
        {
          provide: getRepositoryToken(EmailRegistry),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<EmailRegistryService>(EmailRegistryService);
    emailRegistryRepositoryMock = module.get(getRepositoryToken(EmailRegistry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('returns items, total, and hasMore using skip/take', async () => {
      const rows = [{ email: 'a@example.com' }] as EmailRegistry[];
      emailRegistryRepositoryMock.findAndCount = jest
        .fn()
        .mockResolvedValue([rows, 25]);

      const result = await service.findAllPaginated(0, 20);

      expect(emailRegistryRepositoryMock.findAndCount).toHaveBeenCalledWith({
        order: { email: 'ASC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        items: rows,
        total: 25,
        hasMore: true,
      });
    });

    it('sets hasMore false when page covers remaining items', async () => {
      emailRegistryRepositoryMock.findAndCount = jest
        .fn()
        .mockResolvedValue([[], 10]);

      const result = await service.findAllPaginated(0, 20);

      expect(result.hasMore).toBe(false);
    });
  });

  describe('upsert', () => {
    it('rejects missing email', async () => {
      await expect(service.upsert({})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creates a new entry when email is unknown', async () => {
      emailRegistryRepositoryMock.findOne = jest.fn().mockResolvedValue(null);
      emailRegistryRepositoryMock.create = jest
        .fn()
        .mockImplementation((entity) => entity);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      const result = await service.upsert({
        email: 'User@Example.com',
        is_verified: true,
      });

      expect(emailRegistryRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(emailRegistryRepositoryMock.create).toHaveBeenCalled();
      expect(result.email).toBe('user@example.com');
    });

    it('updates an existing entry by email', async () => {
      const existing = {
        id: '1',
        email: 'user@example.com',
        is_news_notification_enabled: false,
      } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(existing);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      const result = await service.upsert({
        email: 'user@example.com',
        is_news_notification_enabled: true,
      });

      expect(result.is_news_notification_enabled).toBe(true);
      expect(result.news_last_modified_at).toBeInstanceOf(Date);
      expect(emailRegistryRepositoryMock.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws when entry is missing', async () => {
      emailRegistryRepositoryMock.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes an existing entry', async () => {
      const existing = { id: '1', email: 'a@b.com' } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(existing);
      emailRegistryRepositoryMock.remove = jest
        .fn()
        .mockResolvedValue(existing);

      await expect(service.remove('1')).resolves.toEqual(existing);
      expect(emailRegistryRepositoryMock.remove).toHaveBeenCalledWith(existing);
    });
  });
});
