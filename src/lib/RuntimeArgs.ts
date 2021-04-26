/**
 * Implements a collection of runtime arguments.
 */
import { Ok, Err } from 'ts-results';
import { toBytesString, toBytesVector } from './ByteConverters';
import {
  CLValue,
  CLEntity,
  // Result,
  // StringValue,
  CLString,
  ToBytes,
  ToBytesResult,
  ResultAndRemainder,
  resultHelper,
  // U32
  // CLU32
} from './CLValue';
import { concat } from '@ethersproject/bytes';
import { jsonMember, jsonObject } from 'typedjson';

export class NamedArg implements ToBytes {
  constructor(public name: string, public value: CLValue<CLEntity>) {}

  public toBytes(): ToBytesResult {
    const name = toBytesString(this.name);
    const value = this.value.toBytes();
    return Ok(concat([name, value.unwrap()]));
  }

  public static fromBytes(
    bytes: Uint8Array
  ): ResultAndRemainder<NamedArg, string> {
    const {
      result: nameRes,
      remainder: nameRem
    } = CLString.fromBytesWithRemainder(bytes);
    const name = nameRes.unwrap();
    if (!nameRem) {
      return resultHelper(Err('Missing data for value of named arg'));
    }
    // Maybe there should also be fromBytesWithCLTypeWithRemainder ? (ofc better named)
    const value = CLValue.fromBytes(nameRem).unwrap();
    return resultHelper(Ok(new NamedArg(name.value(), value)));
  }
}

const desRA = (_arr: any) => {
  return new Map(
    Array.from(_arr, ([key, value]) => {
      const val = CLValue.fromJSON(value);
      return [key, val.unwrap()];
    })
  );
};

const serRA = (map: Map<string, CLValue<CLEntity>>) => {
  return Array.from(map, ([key, value]) => {
    return [key, value.toJSON().unwrap()];
  });
};

@jsonObject()
export class RuntimeArgs implements ToBytes {
  @jsonMember({
    serializer: serRA,
    deserializer: desRA
  })
  public args: Map<string, CLValue<CLEntity>>;

  constructor(args: Map<string, CLValue<CLEntity>>) {
    this.args = args;
  }

  public static fromMap(args: Record<string, CLValue<CLEntity>>) {
    const map: Map<string, CLValue<CLEntity>> = new Map(
      Object.keys(args).map(k => [k, args[k]])
    );
    return new RuntimeArgs(map);
  }

  public static fromNamedArgs(namedArgs: NamedArg[]) {
    const args = namedArgs.reduce<Record<string, CLValue<CLEntity>>>((pre, cur) => {
      pre[cur.name] = cur.value;
      return pre;
    }, {});
    return RuntimeArgs.fromMap(args);
  }

  public insert(key: string, value: CLValue<CLEntity>) {
    this.args.set(key, value);
  }

  public toBytes(): ToBytesResult {
    const vec = Array.from(this.args.entries()).map((a: [string, CLValue<CLEntity>]) => {
      return new NamedArg(a[0], a[1]);
    });
    return Ok(toBytesVector(vec));
  }

  // TODO: Add tests to check if it is working properly
  // public static fromBytes(bytes: Uint8Array): Result<RuntimeArgs> {
  //   const sizeRes = U32.fromBytes(bytes);
  //   if (sizeRes.hasError()) {
  //     return Result.Err(sizeRes.error);
  //   }
  //   const size = sizeRes.value().val.toNumber();
  //   let remainBytes = sizeRes.remainder();
  //   const res: NamedArg[] = [];
  //   for (let i = 0; i < size; i++) {
  //     const namedArgRes = NamedArg.fromBytes(remainBytes);
  //     if (namedArgRes.hasError()) {
  //       return Result.Err(namedArgRes.error);
  //     }
  //     res.push(namedArgRes.value());
  //     remainBytes = namedArgRes.remainder();
  //   }
  //   return Result.Ok(RuntimeArgs.fromNamedArgs(res), remainBytes);
  // }
}
