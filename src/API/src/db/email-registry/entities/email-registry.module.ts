import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailRegistry } from './email-registry.entity';
import { RecipientSelectionService } from '../recipient-selection.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailRegistry])],
  providers: [RecipientSelectionService],
  exports: [TypeOrmModule, RecipientSelectionService],
})
export class EmailRegistryModule {}
