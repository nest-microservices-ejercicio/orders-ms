import 'dotenv/config';
import { z } from 'zod';

//- validamos con zod
const envsSchema = z.object({
    PORT: z.coerce.number(),
    // PRODUCTS_MS_HOST: z.string(),
    // PRODUCTS_MS_PORT: z.coerce.number(),

    NATS_SERVERS: z
        .string()
        .transform((value) => value.split(',').map((server) => server.trim()))
        .pipe(z.array(z.string().min(1)).min(1)),
});

//- le pasamos a zod las variables de entorno
const result  = envsSchema.safeParse(process.env);

if (!result.success) {
    throw new Error(
        `Config validation error: ${result.error.message}`,
    );
}

export const envs = {
    port: result.data.PORT,
    // products_ms_host: result.data.PRODUCTS_MS_HOST,
    // products_ms_port: result.data.PRODUCTS_MS_PORT,
    natsServers: result.data.NATS_SERVERS,  // string[]
};