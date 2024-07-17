import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-widh.dto';
import { Wish } from './entities/wish.entity';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish)
    private wishesRepository: Repository<Wish>,
  ) {}

  findMany(query: FindManyOptions<Wish>) {
    return this.wishesRepository.find(query);
  }

  async create(owner: User, createWishDto: CreateWishDto): Promise<Wish> {
    delete owner.password;
    delete owner.email;
    const newWish = this.wishesRepository.create({
      ...createWishDto,
      owner: owner,
    });
    return this.wishesRepository.save(newWish);
  }

  async findOne(query: FindOneOptions<Wish>): Promise<Wish> {
    return this.wishesRepository.findOne(query);
  }

  async updateOne(updateWishDto: UpdateWishDto, id: string, userId: number) {
    const wish = await this.wishesRepository.findOne({
      where: [{ id: +id }],
      relations: {
        owner: true,
        offers: true,
      },
    });

    if (wish.offers.length !== 0 && wish.raised !== 0) {
      throw new ForbiddenException(
        'Редактирование подарка невозможжно, если есть желающие скинуться',
      );
    }

    if (userId !== wish.owner.id) {
      throw new ForbiddenException('Редактирование чужих подарков невозможно');
    }

    await this.wishesRepository.update(id, updateWishDto);
  }

  async getWishById(id: number) {
    const wish = await this.wishesRepository.findOne({
      where: [{ id: id }],
      relations: {
        owner: true,
        offers: {
          item: true,
          user: { offers: true, wishes: true, wishlists: true },
        },
      },
    });

    if (!wish) {
      throw new NotFoundException();
    }

    const amounts = wish.offers.map((offer) => Number(offer.amount));

    wish.raised = amounts.reduce(function (acc, val) {
      return acc + val;
    }, 0);

    delete wish.owner.password;
    delete wish.owner.email;

    return wish;
  }

  removeById(id: number) {
    return this.wishesRepository.delete({ id });
  }

  async delete(id: number, userId: number) {
    const wish = await this.findOne({
      where: { id: id },
      relations: {
        owner: true,
        offers: {
          item: true,
          user: { offers: true, wishes: true, wishlists: true },
        },
      },
    });
    if (!wish) {
      throw new NotFoundException();
    }

    if (userId !== wish.owner.id) {
      throw new ForbiddenException('Удаление чужих подарков невозможно');
    }
    await this.removeById(id);
    delete wish.owner.password;
    delete wish.owner.email;
    return wish;
  }

  async findLast() {
    const wishes = await this.wishesRepository.find({
      relations: {
        owner: true,
        offers: {
          item: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: 40,
    });

    wishes.forEach((wish) => {
      const amounts = wish.offers.map((offer) => Number(offer.amount));

      wish.raised = amounts.reduce(function (acc, val) {
        return acc + val;
      }, 0);

      delete wish.owner.password;
      delete wish.owner.email;
    });

    return wishes;
  }

  async findTopWishes() {
    const wishes = await this.wishesRepository.find({
      relations: {
        owner: true,
        offers: {
          item: true,
        },
      },
      order: {
        copied: 'DESC',
      },
      take: 10,
    });

    const copiedWishes = wishes.filter((wish) => {
      if (wish.copied === 0) {
        return;
      }
      return wish;
    });

    copiedWishes.forEach((wish) => {
      const amounts = wish.offers.map((offer) => Number(offer.amount));

      wish.raised = amounts.reduce(function (acc, val) {
        return acc + val;
      }, 0);

      delete wish.owner.password;
      delete wish.owner.email;
    });

    return copiedWishes;
  }

  async copy(owner: User, wishId: number) {
    const wish = await this.findOne({
      where: { id: wishId },
      relations: {
        owner: true,
      },
    });
    if (!wish) {
      throw new NotFoundException();
    }

    const copiedCreateWishDto = {
      name: wish.name,
      link: wish.link,
      image: wish.image,
      price: wish.price,
      description: wish.description,
    };

    const copiedWish = await this.create(owner, copiedCreateWishDto);

    if (copiedWish) {
      const updatedWish = {
        ...wish,
        copied: wish.copied + 1,
      };

      console.log(updatedWish);

      await this.updateOne(
        updatedWish,
        updatedWish.id.toString(),
        updatedWish.owner.id,
      );
    }

    return {};
  }
}
