import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { WishesService } from 'src/wishes/wishes.service';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { CreateWishListDto } from './dto/create-wishList.dto';
import { UpdateWishListDto } from './dto/update-wishList.dto';
import { WishList } from './entities/wishlist.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(WishList)
    private wishListsRepository: Repository<WishList>,
    private wishesService: WishesService,
  ) {}

  findMany(query: FindManyOptions<WishList>) {
    return this.wishListsRepository.find(query);
  }

  async findOne(query: FindOneOptions<WishList>): Promise<WishList> {
    return this.wishListsRepository.findOne(query);
  }

  async getWishlists() {
    const wishLists = await this.findMany({
      relations: {
        owner: true,
        items: true,
      },
    });

    wishLists.forEach((wishList) => {
      delete wishList.owner.password;
      delete wishList.owner.email;
    });

    return wishLists;
  }

  async getWishlistsById(id: string) {
    const wishlist = await this.wishListsRepository.findOne({
      where: [{ id: +id }],
      relations: {
        items: { offers: true },
        owner: true,
      },
    });

    if (!wishlist) {
      throw new NotFoundException();
    }

    wishlist.items.forEach((item) => {
      const amounts = item.offers.map((offer) => Number(offer.amount));
      item.raised = amounts.reduce(function (acc, val) {
        return acc + val;
      }, 0);
    });

    delete wishlist.owner.password;
    delete wishlist.owner.email;

    return wishlist;
  }

  async create(owner: User, createWishListDto: CreateWishListDto) {
    delete owner.password;
    delete owner.email;

    const wishes = await this.wishesService.findMany({});

    const items = createWishListDto.itemsId.map((item) => {
      return wishes.find((wish) => wish.id === item);
    });

    const newWishList = this.wishListsRepository.create({
      ...createWishListDto,
      owner: owner,
      items: items,
    });

    return this.wishListsRepository.save(newWishList);
  }

  async updateOne(
    updateWishListDto: UpdateWishListDto,
    id: string,
    userId: number,
  ) {
    const wishList = await this.findOne({
      where: { id: +id },
      relations: {
        owner: true,
        items: true,
      },
    });

    if (wishList.owner.id !== userId) {
      throw new ForbiddenException('Нельзя редактировать чужие подборки');
    }

    await this.wishListsRepository.update(id, updateWishListDto);
    const updatedWishList = await this.findOne({
      where: { id: +id },
      relations: {
        owner: true,
        items: true,
      },
    });

    delete updatedWishList.owner.password;
    delete updatedWishList.owner.email;
    return updatedWishList;
  }

  removeById(id: number) {
    return this.wishListsRepository.delete({ id });
  }

  async delete(id: number, userId: number) {
    const wishList = await this.findOne({
      where: { id: id },
      relations: {
        owner: true,
        items: true,
      },
    });
    if (!wishList) {
      throw new NotFoundException();
    }

    if (userId !== wishList.owner.id) {
      throw new ForbiddenException('Нельзя удалять чужие подборки');
    }
    await this.removeById(id);

    delete wishList.owner.password;
    delete wishList.owner.email;

    return wishList;
  }
}
