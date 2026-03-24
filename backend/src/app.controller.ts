import { Controller, Get } from '@nestjs/common';

/** Root URL — browsers hitting `http://localhost:3000/` get a JSON hint instead of 404. */
@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'zeyago-backend',
      ok: true,
      routes: {
        auth: '/auth',
        rides: '/rides',
        driver: '/driver',
        admin: '/admin',
      },
    };
  }
}
