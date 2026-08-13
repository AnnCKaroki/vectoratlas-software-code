import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailRegistryController } from '../email-registry.controller';
import { EmailRegistryService } from '../email-registry.service';
import { RecipientSelectionService } from '../recipient-selection.service';
import { EmailRegistry } from './email-registry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailRegistry])],
  controllers: [EmailRegistryController],
  providers: [EmailRegistryService, RecipientSelectionService],
  exports: [TypeOrmModule, EmailRegistryService, RecipientSelectionService],
})
export class EmailRegistryModule {}
