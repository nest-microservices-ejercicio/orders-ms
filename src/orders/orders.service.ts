import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from 'src/orders/dto/order-Pagination.dto';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { PaidOrderDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) {
    super()
  }

  async onModuleInit() {
    await this.$connect();
  }


  //? ----- 
  async create(createOrderDto: CreateOrderDto) {

    try {

      //* 1. Confirmamos los ids de los productos
      const prouctsIds = createOrderDto.items.map(item => item.productId)
      //! -- Comuicacion con otro Microservicio --
      // Validamos en DB que existan los productos
      const products = await firstValueFrom(
        this.client.send({cmd: 'validate_product'}, prouctsIds)
      )

      //* 2. Calculamos el precio total final
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        //. tomamos el precio de cada producto desde la DB, no el que nos llega desde el front
        const price = products.find((product) => product.id === orderItem.productId).price
        //. Multiplicamos el precio por la cantidad que compramos de ese producto
        return acc + price * orderItem.quantity
      }, 0);


      //* 3. Calculamos la cantidad total de prodcutos
      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity
      }, 0)


      //* 4. Creamos una transaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: { 
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find((product) => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          } 
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find(prod => prod.id === orderItem.productId).name as string
        }))
      };

    } catch(error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs'
      })
    }

  }


  //? ----- 
  async findAll(orderPaginationDto: OrderPaginationDto) {

    const {page, limit, status} = orderPaginationDto

    const totalOrders = await this.order.count({where: {status}})
    const totalPages = Math.ceil(totalOrders/limit!)

    const orders = await this.order.findMany({
      skip: (page! - 1)  * limit!, // Restamos 1 para que empiece desde el cero 
      take: limit,
      where: {status},
    })

    return {
      data: orders,
      meta: {
        totalOrders,
        page,
        totalPages
      }
    }
  }


  //? ----- 
  async findOne(id: string) {

    const order = await this.order.findUnique({
      where: {id},
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true 
          }
        }
      }
    })


    if(!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      })
    }

    const productIds = order.OrderItem.map(orderItem => orderItem.productId)

    //- Validamos los procuctos en la DB mediante le Microservicio
    const products = await firstValueFrom(
        this.client.send({cmd: 'validate_product'}, productIds)
      )

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find(prod => prod.id === orderItem.productId).name  //- anidamos el nombre de cada producto
      }))
    }

  }


  //? ----- 
  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto){

    const {id, status} = changeOrderStatusDto;

    const order = await this.findOne(id);
    //- si le mandamos el mismo status, No actualizamos retornamos como lo teniamos
    if(order.status === status) return order;

    if(!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      })
    }

    return this.order.update({
      where: {id},
      data: {status}
    })

  }


  //? --- Creacion del pago -------------------------------
  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map( item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      })
    )

    return paymentSession
  }

  //? --- Cuando el pago se realizo ---
  async paidOrder(paidOrderDto: PaidOrderDto) {

    const order = await this.order.update({
      where: {id: paidOrderDto.orderId},
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,
        //- Relacion con la tabla de orderRecipt
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl
          }
        }
      }
    });

    return order 
  }

}
