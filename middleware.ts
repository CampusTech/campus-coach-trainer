import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/",  // redirect to home page for sign in
  },
})

export const config = {
  matcher: [
    // Add paths that require authentication
    "/api/chat/:path*",  // protect chat API routes
    "/dashboard/:path*", // protect dashboard routes if you have any
    // Don't add "/" since we want it public for sign-in
  ]
}