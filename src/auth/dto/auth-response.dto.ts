import { UserRole } from '../../users/enums/user-role.enum';
import { TenantPlan } from '../../tenants/enums/tenant-plan.enum';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // secondes, ex: 28800 pour 8h

  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId: string;
  };

  tenant!: {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
  };
}
