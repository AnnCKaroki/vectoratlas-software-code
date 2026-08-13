import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationLog } from '../db/communication-log/entities/communication-log.entity';
import { CommunicationLogModule } from '../db/communication-log/communication-log.module';
import { EmailRegistryModule } from '../db/email-registry/entities/email-registry.module';
import { EmailModule } from '../email/email.module';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
    TypeOrmModule.forFeature([CommunicationLog]),
    EmailModule,
    EmailRegistryModule,
    CommunicationLogModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
