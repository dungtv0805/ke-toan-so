import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface DatabaseModuleOptions {
  uri?: string;
  database?: string;
  synchronize?: boolean;
  logging?: boolean;
  user?: string;
  pwd?: string;
}

@Module({})
export class DatabaseModule {
  /**
   * Configure database connection for root module
   * @param options - Database configuration options
   */
  static forRoot(options?: DatabaseModuleOptions): DynamicModule {
    const uri = options?.uri || process.env.MONGODB_URI;
    const database = options?.database || process.env.MONGODB_DATABASE;
    const synchronize =
      options?.synchronize ?? process.env.NODE_ENV === 'development';
    const logging = options?.logging ?? process.env.NODE_ENV === 'development';
    const user = options?.user || process.env.MONGODB_USER;
    const pwd = options?.pwd || process.env.MONGODB_PWD;
    console.log(uri, user, pwd);

    const typeOrmOptions: TypeOrmModuleOptions = {
      type: 'mongodb',
      url: `${uri}`,
      database: database,
      username: user,
      password: pwd,
      synchronize,
      logging,
      autoLoadEntities: true,
    };

    return {
      module: DatabaseModule,
      global: true,
      imports: [TypeOrmModule.forRoot(typeOrmOptions)],
      exports: [TypeOrmModule],
    };
  }

  /**
   * Register entities for feature modules
   * @param entities - Array of entity classes
   */
  static forFeature(entities: any[]): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(entities)],
      exports: [TypeOrmModule],
    };
  }
}
