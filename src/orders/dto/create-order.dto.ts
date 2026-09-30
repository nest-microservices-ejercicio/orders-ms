import { ArrayMinSize, IsArray,  ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
    
    @IsArray()
    @ArrayMinSize(1) //- tiene que tener al menos un valor el array
    @ValidateNested({each: true}) //- Valida internamente cada valor del array, Cada valor 
    @Type(() => OrderItemDto) //- convertimos cada elemento a OrderItemDto
    items: OrderItemDto[]



}
