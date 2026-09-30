import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, NATS_SERVICE } from 'src/config';

@Module({

    imports: [
        //*- Registramos un microservicio con NATS
        ClientsModule.register([
            {
                name: NATS_SERVICE,
                transport: Transport.NATS,
                options: {
                    servers: envs.natsServers 
                }
            }
        ])
    ],

    exports: [
        //*- Registramos un microservicio con NATS
        ClientsModule.register([
            {
                name: NATS_SERVICE,
                transport: Transport.NATS,
                options: {
                    servers: envs.natsServers 
                }
            }
        ])
    ]

})
export class NatsModule {}
