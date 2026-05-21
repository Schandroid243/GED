import { Module, Global } from '@nestjs/common';
import { LocalStorageService } from './storage.service';

@Global() // accessible sans import explicite dans tous les modules agents
@Module({
  providers: [LocalStorageService],
  exports:   [LocalStorageService],
})
export class StorageModule {}
