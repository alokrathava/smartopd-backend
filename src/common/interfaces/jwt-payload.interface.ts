import { Role } from '../enums/role.enum';

export class JwtPayload {
  jti?: string; // JWT ID — used for token blacklisting on logout
  sub: string;
  email: string;
  role: Role;
  facilityId: string | null;
  iat?: number;
  exp?: number;
}
