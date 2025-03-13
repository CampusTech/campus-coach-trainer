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
      return url.startsWith(baseUrl) ? url : baseUrl
    }
  }
}

export const auth = () => getServerSession(authConfig)