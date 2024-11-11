import {
  BaseClassProxy,
  createFunctionProxy,
  MethodFunction,
  MethodThis,
  ModuleLoader,
} from "@/proxy";

export class NTQQLoader extends ModuleLoader {
  private static _instance = new NTQQLoader();
  private _exportHookCb = new Map<
    string,
    (obj: object, hooked: boolean) => any
  >();

  public constructor() {
    super("wrapper.node");
  }

  protected _exportLoader(exportName: string, exportObject: any) {
    const self = this;
    return createFunctionProxy(
      exportObject,
      function (...args: any[]) {
        const result = this.origin(...args);
        const cb = self._exportHookCb.get(`${exportName}.${this.method}`);
        if (cb) return cb(result, true);
        return result;
      },
      true
    );
  }

  static MethodHook<T extends BaseClassProxy>(methodName?: string) {
    return BaseClassProxy.methodHook<T>(methodName);
  }

  // 顺序有要求 必须先Hook
  static AttachClass<T extends BaseClassProxy, T2 extends BaseClassProxy>(
    ctor: new (...args: any[]) => T
  ) {
    const self = this;
    const constructorName = Object.getPrototypeOf(ctor).name;
    return function (
      value: (this: MethodThis<T2>, ...args: any[]) => any,
      context: ClassMethodDecoratorContext<MethodThis<T2>, MethodFunction<T2>>
    ) {
      if (context.kind == "method") {
        const cb = self._instance._exportHookCb.get(constructorName);

        if (cb) {
          return function (this: MethodThis<T2>, ...args: any[]) {
            if (!this.origin)
              throw new Error(
                `You must use @MethodHook before using @AttachClass on method "${String(
                  context.name
                )}"`
              );
            // 处理AttachClass的isHooked总是true的问题
            return cb(value.apply(this, args), this.isHooked);
          };
        }

        return value;
      }
    };
  }

  // 垃圾TS 只能先any了 搞不定
  static Constructor<T extends BaseClassProxy>(constructor?: string): any {
    const self = this;
    return <C extends new (...args: any[]) => T>(
      value: C,
      context: ClassDecoratorContext
    ) => {
      if (context.kind === "class") {
        return class extends (value as new (...args: any[]) => BaseClassProxy) {
          constructor(...args: any[]) {
            super(...args);
            self._instance._exportHookCb.set(
              constructor ? constructor : String(context.name),
              this.attach.bind(this)
            );
          }
        };
      }
      return value;
    };
  }

  public static getInstance() {
    return NTQQLoader._instance;
  }
}
export { default as WrapperSession } from "./instances/wrapper-session"