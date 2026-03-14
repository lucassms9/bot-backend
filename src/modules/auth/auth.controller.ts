import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/signup
   * Registrar novo usuário
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  /**
   * POST /auth/login
   * Login de usuário
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /auth/logout
   * Logout de usuário (protegido)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return this.authService.logout();
  }

  /**
   * POST /auth/refresh
   * Renovar token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * GET /auth/me
   * Retornar dados do usuário logado
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
    };
  }
}
