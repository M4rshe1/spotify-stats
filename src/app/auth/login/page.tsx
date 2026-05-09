import { type Metadata } from "next";
import { LoginForm } from "@/app/auth/login/login-form";
import { ThemeSwitcherRow } from "@/components/theme-switcher";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { withAuth } from "@/lib/hoc-pages";

export const metadata: Metadata = {
  title: "Log in",
};

const Page = withAuth(async () => {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] px-4 py-16">
      <div className="absolute top-4 right-4">
        <ThemeSwitcherRow />
      </div>
      <LoginForm googleAuthEnabled={isGoogleAuthConfigured()} />
    </main>
  );
}, true);

export default Page;