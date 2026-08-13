import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RestPaginatedResult,
  toPaginatedResult,
} from '../../pagination/rest-pagination';
import { EmailRegistry } from './entities/email-registry.entity';

@Injectable()
export class EmailRegistryService {
  constructor(
    @InjectRepository(EmailRegistry)
    private readonly emailRegistryRepository: Repository<EmailRegistry>,
  ) {}

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<RestPaginatedResult<EmailRegistry>> {
    const [items, total] = await this.emailRegistryRepository.findAndCount({
      order: { email: 'ASC' },
      skip,
      take,
    });
    return toPaginatedResult(items, total, skip, take);
  }

  async findOne(id: string): Promise<EmailRegistry | null> {
    return this.emailRegistryRepository.findOne({ where: { id } });
  }

  /**
   * Create or update by unique email. Preference timestamps are refreshed
   * when the corresponding opt-in flag is present on the payload.
   */
  async upsert(payload: Partial<EmailRegistry>): Promise<EmailRegistry> {
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('email is required');
    }

    let entry = await this.emailRegistryRepository.findOne({
      where: { email },
    });

    if (!entry) {
      entry = this.emailRegistryRepository.create({
        ...payload,
        email,
      });
    } else {
      Object.assign(entry, { ...payload, email });
    }

    if (payload.is_news_notification_enabled !== undefined) {
      entry.news_last_modified_at = new Date();
    }
    if (payload.is_new_dataset_notification_enabled !== undefined) {
      entry.new_dataset_last_modified_at = new Date();
    }

    return this.emailRegistryRepository.save(entry);
  }

  async remove(id: string): Promise<EmailRegistry> {
    const entry = await this.findOne(id);
    if (!entry) {
      throw new NotFoundException(`Email registry entry not found: ${id}`);
    }
    return this.emailRegistryRepository.remove(entry);
  }
}
