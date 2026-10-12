import useFilteredObject from "./useFilteredObject";

describe("useFilteredObject", () => {
  it("removes undefined, null, and empty string properties from object", () => {
    const input = {
      name: "Server 1",
      description: "",
      node: null,
      owner_id: undefined,
      port: 25565,
    };

    const output = useFilteredObject(input);

    expect(output).toEqual({
      name: "Server 1",
      port: 25565,
    });
  });

  it("recursively removes empty values from nested objects", () => {
    const input = {
      server: {
        name: "Minecraft",
        details: {
          tag: "",
          memory: 1024,
        },
      },
    };

    const output = useFilteredObject(input);

    expect(output).toEqual({
      server: {
        name: "Minecraft",
        details: {
          memory: 1024,
        },
      },
    });
  });

  it("prunes nested objects that become completely empty after filtering", () => {
    const input = {
      active: true,
      emptyGroup: {
        first: "",
        second: null,
      },
    };

    const output = useFilteredObject(input);

    expect(output).toEqual({
      active: true,
    });
  });
});
