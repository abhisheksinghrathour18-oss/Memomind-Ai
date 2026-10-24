export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserDto;
  message: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
