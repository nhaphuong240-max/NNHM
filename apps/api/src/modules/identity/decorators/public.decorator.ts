import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../identity.types';

/** Skip JWT guard — public routes (login, health, public search) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
