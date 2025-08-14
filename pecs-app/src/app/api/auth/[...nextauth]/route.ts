import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';

const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'demo',
      name: 'Demo User',
      type: 'credentials',
      credentials: {},
      async authorize() {
        // Return a demo user for now
        return {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
        };
      },
    },
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };