import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateWishListDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  image: string;

  @IsOptional()
  description: string;

  @IsArray()
  @IsOptional()
  itemsId: number[];
}
