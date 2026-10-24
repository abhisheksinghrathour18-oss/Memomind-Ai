import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '@memomind/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof UserDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDto;

    return data ? user?.[data] : user;
  },
);
