import { IsArray, IsString, IsUrl } from 'class-validator';

export class CreateWishListDto {
  @IsString()
  name: string;

  @IsString()
  @IsUrl()
  image: string;

  @IsArray()
  itemsId: number[];
}
