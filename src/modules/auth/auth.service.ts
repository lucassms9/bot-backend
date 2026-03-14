import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Registrar novo usuário
   */
  async signup(signupDto: SignupDto) {
    const { email, password } = signupDto;

    try {
      const { data, error } = await this.supabaseService.getClient().auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new ConflictException('Email já cadastrado');
        }
        throw new InternalServerErrorException(error.message);
      }

      if (!data.user) {
        throw new InternalServerErrorException('Erro ao criar usuário');
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: data.session,
        message: 'Usuário criado com sucesso',
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao registrar usuário');
    }
  }

  /**
   * Login de usuário
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new UnauthorizedException('Email ou senha incorretos');
      }

      if (!data.user || !data.session) {
        throw new UnauthorizedException('Email ou senha incorretos');
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao fazer login');
    }
  }

  /**
   * Verificar token e retornar usuário
   */
  async verifyToken(token: string) {
    try {
      const { data, error } = await this.supabaseService.getClient().auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      return {
        id: data.user.id,
        email: data.user.email,
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Logout (invalidar sessão)
   */
  async logout() {
    try {
      // Supabase invalida a sessão automaticamente
      await this.supabaseService.getClient().auth.signOut();

      return { message: 'Logout realizado com sucesso' };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao fazer logout');
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const { data, error } = await this.supabaseService.getClient().auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }
}
