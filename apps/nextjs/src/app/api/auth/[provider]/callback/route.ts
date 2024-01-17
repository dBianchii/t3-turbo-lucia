import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { OAuth2RequestError } from "arctic"

import type { Providers } from "@acme/auth"
import { lucia, providers } from "@acme/auth"

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: { provider: string }
  },
): Promise<Response> {
  if (!Object.keys(providers).includes(params.provider)) {
    console.error("Invalid oauth provider", params.provider)
    return new Response(null, {
      status: 400,
    })
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const storedState = cookies().get(`oauth_state`)?.value ?? null
  if (!code || !state || !storedState || state !== storedState) {
    console.log("invalid code / state / storedState ", params.provider)

    return new Response(null, {
      status: 400,
    })
  }

  try {
    const currentProvider = providers[params.provider as Providers]

    const userId = await currentProvider.handleCallback(code)

    const session = await lucia.createSession(userId, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    )
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    })
  } catch (e) {
    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(null, {
        status: 400,
      })
    }
    return new Response(null, {
      status: 500,
    })
  }
}
