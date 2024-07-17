import { Injectable, NotFoundException } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { WishesService } from 'src/wishes/wishes.service';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Offer } from './entities/offer.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    private wishesService: WishesService,
  ) {}

  async create(user: User, createOfferDto: CreateOfferDto): Promise<Offer> {
    const wish = await this.wishesService.findOne({
      where: { id: createOfferDto.itemId },
      relations: {
        offers: true,
        owner: true,
      },
    });

    const sum = await this.sumOfMoney(wish.id);

    wish.raised = sum;

    if (
      wish.raised > wish.price ||
      wish.raised + createOfferDto.amount > wish.price
    ) {
      throw new ForbiddenException('Сумма взноса превышает стоиомость подарка');
    }

    if (wish.owner.id === user.id) {
      throw new ForbiddenException(
        'Внести деньги на собственный подарок невозможно',
      );
    }

    const newOffer = this.offersRepository.create({
      ...createOfferDto,
      user: user,
      item: wish,
    });

    if (newOffer.hidden === false) {
      delete newOffer.user;
      return this.offersRepository.save(newOffer);
    }

    delete newOffer.user.password;
    delete newOffer.user.email;
    delete newOffer.item.owner.password;
    delete newOffer.item.owner.email;

    return this.offersRepository.save(newOffer);
  }

  async findOne(query: FindOneOptions<Offer>): Promise<Offer> {
    return this.offersRepository.findOne(query);
  }

  findMany(query: FindManyOptions<Offer>) {
    return this.offersRepository.find(query);
  }

  async getOffers() {
    const offersArr = await this.findMany({
      relations: {
        item: { offers: true, owner: true },
        user: {
          offers: { item: true },
          wishes: { offers: true, owner: true },
          wishlists: true,
        },
      },
    });

    offersArr.forEach((offer) => {
      offer.amount = Number(offer.amount);
      offer.item.price = Number(offer.item.price);
      delete offer.item.owner.password;
      delete offer.item.owner.email;
      offer.user?.wishes.forEach((wish) => (wish.price = Number(wish.price)));
    });

    return offersArr;
  }

  async getOfferById(id: string) {
    const offer = await this.offersRepository.findOne({
      where: [{ id: +id }],
      relations: {
        item: { offers: true, owner: true },
        user: { offers: true, wishes: true, wishlists: true },
      },
    });
    if (!offer) {
      throw new NotFoundException();
    }

    offer.amount = Number(offer.amount);
    delete offer.item.owner.password;
    delete offer.item.owner.email;
    offer.item.price = Number(offer.item.price);

    return offer;
  }

  async updateOne(updateWishDto: Offer, id: string, userId: number) {
    const offer = await this.offersRepository.findOne({
      where: [{ id: +id }],
      relations: {
        user: true,
      },
    });

    if (offer.user.id === userId) {
      return;
    }
    return this.offersRepository.update(id, updateWishDto);
  }

  async removeOne(id: number, userId: number) {
    const offer = await this.offersRepository.findOne({
      where: [{ id: +id }],
      relations: {
        user: true,
      },
    });

    if (offer.user.id === userId) {
      return;
    }

    return this.offersRepository.delete({ id });
  }

  async sumOfMoney(wishId: number) {
    const wish = await this.wishesService.findOne({
      where: { id: wishId },
      relations: {
        offers: true,
      },
    });

    const offerAmountsArr = wish.offers.map((offer) => Number(offer.amount));
    const sum = offerAmountsArr.reduce(function (acc, val) {
      return acc + val;
    }, 0);

    return sum;
  }
}
