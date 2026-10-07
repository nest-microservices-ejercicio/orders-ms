import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto, OrderPaginationDto, PaidOrderDto } from './dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  //?- Creamos la orden
  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    //- Creamos la orden
    const order = await this.ordersService.create(createOrderDto)
    //- Realizamos el pago
    const paymentSession = await this.ordersService.createPaymentSession(order)
    
    return {
      paymentSession,
      order
    }
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }


  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeOrderStatus(changeOrderStatusDto)
  }

  //- Viene de un .emit(), y el EventPattern no retorna una respuesta
  @EventPattern('payment.succeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto) {
    return this.ordersService.paidOrder(paidOrderDto)
  }

}
