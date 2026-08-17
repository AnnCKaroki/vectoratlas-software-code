import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailRegistryController } from '../email-registry.controller';
import { EmailRegistryService } from '../email-registry.service';
import { RecipientSelectionService } from '../recipient-selection.service';
import { EmailRegistry } from './email-registry.entity';
import { EmailModule } from '../../../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailRegistry]), EmailModule],
  controllers: [EmailRegistryController],
  providers: [EmailRegistryService, RecipientSelectionService],
  exports: [TypeOrmModule, EmailRegistryService, RecipientSelectionService],
})
export class EmailRegistryModule {}
