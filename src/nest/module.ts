import {
  DynamicModule,
  Module,
  OnApplicationBootstrap,
  Inject,
  Optional,
} from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import type { StrictJsonOptions } from "../core/types.js";
import { registerStrictJson } from "./register.js";

export const STRICT_JSON_OPTIONS = Symbol("STRICT_JSON_OPTIONS");
export const NEST_APP = Symbol("NEST_APP");

@Module({})
export class StrictJsonModule implements OnApplicationBootstrap {
  public constructor(
    @Optional()
    @Inject(STRICT_JSON_OPTIONS)
    private readonly options: StrictJsonOptions | undefined,
    @Optional()
    @Inject(NEST_APP)
    private readonly app: INestApplication | undefined,
  ) {}

  public static forRoot(options?: StrictJsonOptions): DynamicModule {
    return {
      module: StrictJsonModule,
      providers: [
        {
          provide: STRICT_JSON_OPTIONS,
          useValue: options,
        },
      ],
      exports: [STRICT_JSON_OPTIONS],
    };
  }

  public onApplicationBootstrap(): void {
    if (!this.app) return;
    registerStrictJson(this.app as never, this.options);
  }
}
