import { Role } from '../enums/role.enum';

export class JwtPayload {
  sub: string;
  email: string;
  role: Role;
  facilityId: string | null;
  iat?: number;
  exp?: number;
}
