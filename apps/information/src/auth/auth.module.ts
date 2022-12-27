import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from '../core/strategy';
import { AuthService } from '../core/services';
import { UserRepository } from '../core/repository';


@Module({
    imports: [JwtModule.register({})],
    controllers: [AuthController],
    providers: [JwtStrategy, AuthService, UserRepository]
})
export class AuthModule { }
