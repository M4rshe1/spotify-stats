import { withAuth } from "@/lib/hoc-pages";

const Page = withAuth(async () => {
  return <div>Track</div>;
});

export default Page;
