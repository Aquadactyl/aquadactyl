import { isObject, isEmptyObject, getObjectKeys } from "@/lib/objects";

describe("@/lib/objects.ts", function () {
  describe("isObject()", function () {
    it("should return true for objects", function () {
      expect(isObject({})).toBe(true);
      expect(isObject({ foo: 123 })).toBe(true);
      expect(isObject(Object.freeze({}))).toBe(true);
    });

    it("should return false for null", function () {
      expect(isObject(null)).toBe(false);
    });

    it.each([
      undefined,
      123,
      "foobar",
      () => ({}),
      Function,
      String(123),
      isObject,
      () => null,
      [],
      [1, 2, 3],
    ])("should return false for %p", function (value) {
      expect(isObject(value)).toBe(false);
    });
  });

  describe("isEmptyObject()", function () {
    it("should return true for empty plain object", function () {
      expect(isEmptyObject({})).toBe(true);
    });

    it("should return false for objects with properties", function () {
      expect(isEmptyObject({ a: 1 })).toBe(false);
    });

    it("should return false for objects with non-Object prototype", function () {
      const custom = Object.create(null);
      expect(isEmptyObject(custom)).toBe(false);
    });
  });

  describe("getObjectKeys()", function () {
    it("should return keys of the object", function () {
      expect(getObjectKeys({ a: 1, b: "two" })).toEqual(["a", "b"]);
      expect(getObjectKeys({})).toEqual([]);
    });
  });
});
