import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { NotificationPreferenceType } from '../../commonTypes';
import {
  RestPaginatedResult,
  toPaginatedResult,
} from '../../pagination/rest-pagination';
import { EmailRegistry } from './entities/email-registry.entity';

/**
 * Eligible recipients must be verified and opted in for the requested
 * notification type. Defaults on the registry are opt-in (false).
 */
@Injectable()
export class RecipientSelectionService {
  constructor(
    @InjectRepository(EmailRegistry)
    private readonly emailRegistryRepository: Repository<EmailRegistry>,
  ) {}

  async findEligibleRecipients(
    notificationType: NotificationPreferenceType,
  ): Promise<EmailRegistry[]> {
    const where = this.buildEligibilityWhere(notificationType);
    return this.emailRegistryRepository.find({
      where,
      order: { email: 'ASC' },
    });
  }

  async findEligibleRecipientsPaginated(
    notificationType: NotificationPreferenceType,
    skip: number,
    take: number,
  ): Promise<RestPaginatedResult<EmailRegistry>> {
    const where = this.buildEligibilityWhere(notificationType);
    const [items, total] = await this.emailRegistryRepository.findAndCount({
      where,
      order: { email: 'ASC' },
      skip,
      take,
    });
    return toPaginatedResult(items, total, skip, take);
  }

  private buildEligibilityWhere(
    notificationType: NotificationPreferenceType,
  ): FindOptionsWhere<EmailRegistry> {
    const preferenceField = this.resolvePreferenceField(notificationType);
    return {
      is_verified: true,
      [preferenceField]: true,
    };
  }

  private resolvePreferenceField(
    notificationType: NotificationPreferenceType,
  ): keyof EmailRegistry {
    switch (notificationType) {
      case NotificationPreferenceType.NEWS:
        return 'is_news_notification_enabled';
      case NotificationPreferenceType.NEW_DATASET:
        return 'is_new_dataset_notification_enabled';
      default:
        throw new BadRequestException(
          `Unsupported notification preference type: ${notificationType}`,
        );
    }
  }
}
