import GoogleProvider from "next-auth/providers/google"
import { AuthOptions } from "next-auth"
import { getServerSession } from "next-auth/next"

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return baseUrl
    },
    jwt: async ({ token, user, account }) => {
      if (account && user) {
        // Save user to database after successful sign-in
        try {
          const userData = {
            name: user.name,
            email: user.email,
            image: user.image
          };

          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/user/save-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
          });

          if (!response.ok) {
            console.error('Failed to save user:', await response.text());
          }
        } catch (error) {
          console.error('Error saving user:', error);
        }

        return {
          ...token,
          accessToken: account.access_token,
          email: user.email,
          name: user.name,
          picture: user.image,
          id: user.id || token.sub,
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id || token.sub,
          accessToken: token.accessToken,
        }
      }
    }
  }
}

export const auth = () => getServerSession(authConfig)