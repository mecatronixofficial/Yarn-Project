import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.user.findMany({ select: { id:true,name:true,email:true,role:true,status:true,employeeId:true,createdAt:true }, orderBy:{createdAt:'desc'} }); }
  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where:{email:dto.email.toLowerCase()} });
    if (exists) throw new ConflictException('Email already exists');
    return this.prisma.user.create({ data:{ name:dto.name,email:dto.email.toLowerCase(),passwordHash:await argon2.hash(dto.password),role:dto.role,employeeId:dto.employeeId }, select:{id:true,name:true,email:true,role:true,status:true} });
  }
}
