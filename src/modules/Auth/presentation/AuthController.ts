import type { Request, Response } from 'express';
import { LoginSchema } from '../domain/LoginSchema';
import type { LoginUseCase } from '../application/LoginUseCase';
import type { RequestPasswordResetUseCase } from '../application/RequestPasswordResetUseCase';
import type { ResetPasswordUseCase } from '../application/ResetPasswordUseCase';
import { ForgotPasswordSchema, ResetPasswordSchema } from '../domain/PasswordSchema';
import { getRequestActor } from '../../ApiKey/presentation/actorMiddleware';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  public readonly login = async (req: Request, res: Response): Promise<void> => {
    const input = LoginSchema.parse(req.body);
    const result = await this.loginUseCase.execute(input, req.ip ?? 'desconocida');
    res.status(200).json(result);
  };

  // Siempre 200, exista o no el correo: una respuesta distinta convertiría este endpoint
  // en un buscador de qué correos tienen cuenta.
  public readonly forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await this.requestPasswordResetUseCase.execute(email);
    res.status(200).json({
      message:
        'Si ese correo tiene una cuenta, le llegará un enlace para cambiar la contraseña.',
    });
  };

  public readonly resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = ResetPasswordSchema.parse(req.body);
    await this.resetPasswordUseCase.execute(token, password);
    res.status(200).json({ message: 'Listo, ya puedes entrar con tu contraseña nueva.' });
  };

  // Detrás del middleware de actor: confirma la sesión (o la clave) y devuelve quién es.
  public readonly me = (_req: Request, res: Response): void => {
    const actor = getRequestActor(res);
    res.status(200).json({
      user: { id: actor.id, name: actor.name, role: actor.role },
      actorType: actor.type,
      permission: actor.permission,
    });
  };
}
