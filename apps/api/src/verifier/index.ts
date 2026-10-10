import { GraphApiVerifier } from "./graph-api";
import { NoopVerifier, type Verifier } from "./verifier";

export {
  GRAPH_API_HASHTAG_BUDGET,
  GraphApiNotImplementedError,
  GraphApiVerifier,
  type GraphApiConfig,
} from "./graph-api";
export {
  NoopVerifier,
  type VerifiedResult,
  type VerifiedStatus,
  type Verifier,
} from "./verifier";

/** The subset of Worker env the verifier reads. Credentials are secrets, so they are optional here. */
export interface VerifierEnv {
  GRAPH_API_ENABLED?: string;
  GRAPH_API_ACCESS_TOKEN?: string;
  GRAPH_API_IG_USER_ID?: string;
}

export function isGraphApiEnabled(env: VerifierEnv): boolean {
  return env.GRAPH_API_ENABLED?.trim().toLowerCase() === "true";
}

/** Returns the NoopVerifier unless GRAPH_API_ENABLED is "true". */
export function createVerifier(env: VerifierEnv): Verifier {
  if (!isGraphApiEnabled(env)) return new NoopVerifier();

  const accessToken = env.GRAPH_API_ACCESS_TOKEN;
  const igUserId = env.GRAPH_API_IG_USER_ID;
  if (!accessToken || !igUserId) {
    throw new Error(
      "GRAPH_API_ENABLED is set but GRAPH_API_ACCESS_TOKEN or GRAPH_API_IG_USER_ID is missing.",
    );
  }
  return new GraphApiVerifier({ accessToken, igUserId });
}
