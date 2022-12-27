import { User } from '@app/prisma';
import { Body, Controller, Post, HttpException, HttpStatus, HttpCode, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import { AuthDTO, SignupDTO } from '../core/dto';
import { UserEntity } from '../core/entities/user.entity';
import { JwtGuard } from '../core/guards';
import { AuthService } from '../core/services';



@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) {}

    @Post('signin')
    signin(@Body() dto: AuthDTO) {
        return this.authService.signin(dto)
    }

    @HttpCode(HttpStatus.OK)
    @Post('signup')
    signup(@Body() dto: SignupDTO) {
        return this.authService.signup(dto)
    }

    @UseGuards(JwtGuard)
    @Get('me')
    @ApiOkResponse({ type: UserEntity })
    getUserByToken(@GetUser() user: User) {
        return user
    }

}
