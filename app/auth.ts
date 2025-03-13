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
          prompt: "select_account",
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
      console.log('=== Auth Redirect Debug ===');
      console.log('Incoming URL:', url);
      console.log('Base URL:', baseUrl);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

      if (url.startsWith('/')) {
        const finalUrl = `${baseUrl}${url}`;
        console.log('Redirecting to relative path:', finalUrl);
        return finalUrl;
      }
      if (url.startsWith(baseUrl)) {
        console.log('Redirecting to same-origin URL:', url);
        return url;
      }
      console.log('Falling back to base URL:', baseUrl);
      return baseUrl;
    },
    jwt: async ({ token, user, account }) => {
      console.log('=== JWT Callback Debug ===');
      if (account && user) {
        console.log('New sign in detected');
        console.log('Full account data:', account);
        console.log('Full user data:', user);

        return {
          ...token,
          accessToken: account.access_token,
          email: user.email,
          name: user.name,
          picture: user.image,
          id: user.id || token.sub,
        };
      }
      return token;
    },
    session: async ({ session, token }) => {
      console.log('=== Session Callback Debug ===');
      console.log('Session before:', session);
      const enhancedSession = {
        ...session,
        user: {
          ...session.user,
          id: token.id || token.sub,
          accessToken: token.accessToken,
        }
      };
      console.log('Session after:', enhancedSession);
      return enhancedSession;
    }
  }
}

export const auth = () => getServerSession(authConfig)