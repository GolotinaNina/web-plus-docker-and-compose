import { Min } from 'class-validator';

export class CreateOfferDto {
  @Min(1)
  amount: number;

  hidden?: boolean;

  itemId: number;
}
