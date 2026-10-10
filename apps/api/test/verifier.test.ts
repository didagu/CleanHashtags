import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVerifier,
  GraphApiNotImplementedError,
  GraphApiVerifier,
  isGraphApiEnabled,
  NoopVerifier,
} from "../src/verifier";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NoopVerifier", () => {
  it("verifies nothing and makes no network calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      new NoopVerifier().verify(["sunset", "alone"]),
    ).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles an empty tag list", async () => {
    await expect(new NoopVerifier().verify([])).resolves.toEqual([]);
  });
});

describe("createVerifier", () => {
  it("defaults to the noop verifier with the Worker's configured env", () => {
    expect(isGraphApiEnabled(env)).toBe(false);
    expect(createVerifier(env)).toBeInstanceOf(NoopVerifier);
  });

  it.each([undefined, "", "false", "0", "yes"])(
    "stays noop when GRAPH_API_ENABLED is %j",
    (flag) => {
      const verifier = createVerifier({
        GRAPH_API_ENABLED: flag,
        GRAPH_API_ACCESS_TOKEN: "token",
        GRAPH_API_IG_USER_ID: "1784",
      });

      expect(verifier.name).toBe("noop");
    },
  );

  it("builds the Graph API verifier when enabled with credentials", () => {
    const verifier = createVerifier({
      GRAPH_API_ENABLED: " TRUE ",
      GRAPH_API_ACCESS_TOKEN: "token",
      GRAPH_API_IG_USER_ID: "1784",
    });

    expect(verifier).toBeInstanceOf(GraphApiVerifier);
  });

  it("refuses to enable the Graph API without credentials", () => {
    expect(() => createVerifier({ GRAPH_API_ENABLED: "true" })).toThrow(
      /GRAPH_API_ACCESS_TOKEN/,
    );
  });
});

describe("GraphApiVerifier stub", () => {
  it("rejects without calling the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const verifier = new GraphApiVerifier({
      accessToken: "token",
      igUserId: "1784",
    });

    await expect(verifier.verify(["sunset"])).rejects.toBeInstanceOf(
      GraphApiNotImplementedError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
