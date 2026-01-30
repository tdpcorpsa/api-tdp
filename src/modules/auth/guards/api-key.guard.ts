import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validApiKey = this.configService.get<string>('API_KEY');

    if (!validApiKey) {
      // Si no hay API KEY configurada en el servidor, bloqueamos todo por seguridad
      // o permitimos todo (depende de la política). Aquí bloqueamos.
      return false;
    }

    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('API Key inválida o ausente');
    }

    return true;
  }
}
