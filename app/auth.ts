import GoogleProvider from "next-auth/providers/google"
import { AuthOptions } from "next-auth"
import { getServerSession } from "next-auth/next"

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt"
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return new URL(url, baseUrl).toString()
      return baseUrl
    },
    session: async ({ session }) => {
      return session
    },
    jwt: async ({ token, user, account }) => {
      if (account && user) {
        token.accessToken = account.access_token
      }
      return token
    }
  }
}

export const auth = () => getServerSession(authConfig)