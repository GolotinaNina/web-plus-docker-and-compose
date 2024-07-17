import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Delete, Header, Patch } from '@nestjs/common/decorators';
import { JwtGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/types/types';
import { CreateWishListDto } from './dto/create-wishList.dto';
import { UpdateWishListDto } from './dto/update-wishList.dto';
import { WishlistsService } from './wishlists.service';

@Controller('wishlistlists')
export class WishlistsController {
  constructor(private wishlistsService: WishlistsService) {}

  @Get()
  getWishlists() {
    return this.wishlistsService.getWishlists();
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  getWishlistsById(@Param('id') id: string) {
    return this.wishlistsService.getWishlistsById(id);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(
    @Body() createWishListDto: CreateWishListDto,
    @Req() req: RequestWithUser,
  ) {
    return this.wishlistsService.create(req.user, createWishListDto);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  @Header('Content-Type', 'application/json')
  async updateWishlistlists(
    @Body() updateWishListDto: UpdateWishListDto,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.wishlistsService.updateOne(updateWishListDto, id, req.user.id);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.wishlistsService.delete(id, req.user.id);
  }
}
