import Stripe from "stripe";

// No explicit apiVersion: the installed SDK is pinned to its own API version and its
// request/response types match it. Hardcoding an older version drifts from the types.
let client: Stripe | null = null;

function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

/**
 * Lazily-constructed Stripe client.
 *
 * The secret key is only needed to serve a request, not to build the app. Constructing
 * Stripe at module load made `next build` fail while collecting page data for any route
 * importing this file whenever the key was absent from the build environment. The proxy
 * defers construction to first property access, so a missing key surfaces as a runtime
 * error on the route that needs it rather than a build failure.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const real = getStripe();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
