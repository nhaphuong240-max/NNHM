import { SetMetadata } from '@nestjs/common';

export const ALLOW_CONTRACT_SIGN_TOKEN = 'allowContractSignToken';

/** JWT is not required when a contract sign token is present. The controller still checks the token. */
export const AllowContractSignToken = () => SetMetadata(ALLOW_CONTRACT_SIGN_TOKEN, true);
