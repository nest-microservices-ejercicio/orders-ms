import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "src/common";
import { OrderStatus } from "@prisma/client";
import { OrderStatusList } from "src/orders/enum/order.enum";

export class OrderPaginationDto extends PaginationDto {
    @IsOptional()
    @IsEnum(OrderStatusList, {
        message: `valid status are ${OrderStatusList}`
    })
    status: OrderStatus
}