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
      console.log('=== Auth Redirect Debug ===');
      console.log('Incoming URL:', url);
      console.log('Base URL:', baseUrl);

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
    session: async ({ session, token }) => {
      console.log('=== Session Callback Debug ===');
      console.log('Session data:', {
        user: session?.user,
        expires: session?.expires
      });
      return session;
    },
    jwt: async ({ token, user, account }) => {
      console.log('=== JWT Callback Debug ===');
      console.log('Token payload:', {
        sub: token.sub,
        email: token.email,
        hasAccessToken: !!token.accessToken
      });
      if (account && user) {
        console.log('New sign in detected');
        console.log('Account provider:', account.provider);
        console.log('Has access token:', !!account.access_token);
        token.accessToken = account.access_token;
      }
      return token;
    }
  }
}

export const auth = () => getServerSession(authConfig)