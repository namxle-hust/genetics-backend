import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthDTO, SignupDTO } from '../dto';
import { UserRepository } from '../repository';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import * as argon from 'argon2'
import { ISignToken, IUserCreateInput } from '../models';

@Injectable()
export class AuthService {

    constructor(
        private userRepository: UserRepository,
        private config: ConfigService,
        private jwt: JwtService
    ) { }

    async signin(dto: AuthDTO): Promise<ISignToken> {
        const user = await this.userRepository.findUnique({ email: dto.email })

        if (!user) {
            throw new ForbiddenException('Credentials incorrect')
        }

        const pwMatched = await argon.verify(
            user.hash,
            dto.password
        )

        if (!pwMatched) {
            throw new ForbiddenException('Credentials incorrect')
        }

        return this.signToken(user.id);
    }

    async signToken(userId: number): Promise<ISignToken> {
        const payload = {
            id: userId
        }

        const token = await this.jwt.sign(payload, {
            expiresIn: '7d',
            secret: this.config.get('JWT_SECRET')
        })

        return {
            access_token: token
        }
    }

    async signup(dto: SignupDTO): Promise<{}> {
        const hash = await argon.hash(dto.password);
        
        let data: IUserCreateInput = {
            firstName: dto.firstName,
            lastName: dto.lastName,
            hash: hash,
            email: dto.email
        }

        await this.userRepository.create(data)

        return {}
    }
}
